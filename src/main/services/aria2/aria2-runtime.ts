import type { RuntimeStatus } from "@shared/types";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { Aria2RpcClient } from "./rpc-client";
import {
  ensureAria2DataFiles,
  pathExists,
  resolveAria2RuntimePaths,
  type Aria2RuntimePaths,
} from "./runtime-paths";

export interface Aria2RuntimeStartOptions {
  downloadDirectory: string;
  maxConcurrentDownloads: number;
  connectionsPerTask: number;
  globalDownloadLimit: number | null;
  globalUploadLimit: number | null;
  proxyUrl: string | null;
  advancedAria2Options: Record<string, string>;
}

export class Aria2Runtime {
  private readonly maxRestartAttempts = 1;

  private status: RuntimeStatus = {
    availability: "starting",
    message: "aria2 runtime is starting.",
    pid: null,
    rpcPort: null,
    startedAt: null,
  };

  private paths: Aria2RuntimePaths | null = null;
  private process: ChildProcessWithoutNullStreams | null = null;
  private client: Aria2RpcClient | null = null;
  private lastStartOptions: Aria2RuntimeStartOptions | null = null;
  private restartAttempts = 0;
  private isShuttingDown = false;

  getStatus(): RuntimeStatus {
    return { ...this.status };
  }

  getClient(): Aria2RpcClient {
    if (!this.client || this.status.availability !== "ready") {
      throw new Error("aria2 runtime is not available.");
    }

    return this.client;
  }

  async start(options: Aria2RuntimeStartOptions): Promise<void> {
    this.lastStartOptions = options;
    this.isShuttingDown = false;
    this.paths = resolveAria2RuntimePaths();
    await ensureAria2DataFiles(this.paths);

    if (!(await pathExists(this.paths.binaryPath))) {
      this.status = {
        availability: "unavailable",
        message: `Bundled aria2c binary was not found at ${this.paths.binaryPath}.`,
        pid: null,
        rpcPort: null,
        startedAt: null,
      };
      return;
    }

    const rpcPort = await getAvailablePort();
    const secret = await getOrCreateSecret(this.paths.rpcSecretFile);
    const args = buildAria2Args(this.paths, options, rpcPort, secret);

    this.status = {
      availability: "starting",
      message: "Starting bundled aria2c runtime.",
      pid: null,
      rpcPort,
      startedAt: null,
    };

    this.process = spawn(this.paths.binaryPath, args, {
      cwd: this.paths.dataDirectory,
      windowsHide: true,
    });

    this.process.once("spawn", () => {
      this.restartAttempts = 0;
      this.client = new Aria2RpcClient({
        endpoint: `http://127.0.0.1:${rpcPort}/jsonrpc`,
        secret,
      });
      this.status = {
        availability: "ready",
        message: null,
        pid: this.process?.pid ?? null,
        rpcPort,
        startedAt: new Date().toISOString(),
      };
    });

    this.process.once("error", (error) => {
      this.status = {
        availability: "unavailable",
        message: error.message,
        pid: null,
        rpcPort: null,
        startedAt: null,
      };
    });

    this.process.once("exit", (code, signal) => {
      this.client = null;
      this.process = null;
      const canRetry =
        !this.isShuttingDown &&
        this.lastStartOptions !== null &&
        this.restartAttempts < this.maxRestartAttempts;

      this.status = {
        availability: canRetry ? "starting" : "unavailable",
        message: `aria2 exited${code === null ? "" : ` with code ${code}`}${
          signal ? ` and signal ${signal}` : ""
        }.${canRetry ? " Restarting runtime." : ""}`,
        pid: null,
        rpcPort: null,
        startedAt: null,
      };

      if (canRetry) {
        this.restartAttempts += 1;
        setTimeout(() => {
          if (this.lastStartOptions) {
            void this.start(this.lastStartOptions);
          }
        }, 1000);
      }
    });
  }

  async saveSession(): Promise<void> {
    if (!this.client || this.status.availability !== "ready") {
      return;
    }

    await this.client.saveSession();
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (!this.process) {
      return;
    }

    try {
      await this.saveSession();
      await this.client?.shutdown();
    } catch {
      this.process.kill();
    }
  }
}

function buildAria2Args(
  paths: Aria2RuntimePaths,
  options: Aria2RuntimeStartOptions,
  rpcPort: number,
  secret: string,
): string[] {
  const args = [
    "--enable-rpc=true",
    "--rpc-listen-all=false",
    "--rpc-listen-address=127.0.0.1",
    `--rpc-listen-port=${rpcPort}`,
    `--rpc-secret=${secret}`,
    `--dir=${options.downloadDirectory}`,
    `--input-file=${paths.sessionFile}`,
    `--save-session=${paths.sessionFile}`,
    "--save-session-interval=30",
    "--continue=true",
    `--max-concurrent-downloads=${options.maxConcurrentDownloads}`,
    `--max-connection-per-server=${options.connectionsPerTask}`,
  ];

  if (options.globalDownloadLimit !== null) {
    args.push(`--max-overall-download-limit=${options.globalDownloadLimit}`);
  }

  if (options.globalUploadLimit !== null) {
    args.push(`--max-overall-upload-limit=${options.globalUploadLimit}`);
  }

  if (options.proxyUrl) {
    args.push(`--all-proxy=${options.proxyUrl}`);
  }

  for (const [key, value] of Object.entries(options.advancedAria2Options)) {
    args.push(`--${key}=${value}`);
  }

  return args;
}

async function getOrCreateSecret(secretFile: string): Promise<string> {
  if (await pathExists(secretFile)) {
    const existing = (await readFile(secretFile, "utf8")).trim();

    if (existing) {
      return existing;
    }
  }

  const secret = randomBytes(24).toString("hex");
  await writeFile(secretFile, secret, "utf8");
  return secret;
}

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Unable to allocate local aria2 RPC port."));
        }
      });
    });
  });
}
