import type { RuntimeStatus } from "@shared/types";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { Aria2RpcClient } from "./rpc-client";
import {
  ensureAria2DataFiles,
  isExecutableFile,
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
  private readonly rpcReadyTimeoutMs = 5000;
  private readonly shutdownTimeoutMs = 3000;

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
  private recentProcessOutput: string[] = [];
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

  async applySettings(options: Aria2RuntimeStartOptions): Promise<void> {
    this.lastStartOptions = options;

    if (!this.client || this.status.availability !== "ready") {
      return;
    }

    await this.client.changeGlobalOption(buildRuntimeGlobalOptions(options));
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

    if (!(await isExecutableFile(this.paths.binaryPath))) {
      this.status = {
        availability: "unavailable",
        message: `Bundled aria2c binary is not executable at ${this.paths.binaryPath}.`,
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

    this.recentProcessOutput = [];
    this.process = spawn(this.paths.binaryPath, args, {
      cwd: this.paths.dataDirectory,
      windowsHide: true,
    });

    const child = this.process;
    attachProcessOutput(child, (chunk) =>
      appendRecentOutput(this.recentProcessOutput, chunk),
    );

    child.once("error", (error) => {
      this.status = {
        availability: "unavailable",
        message: error.message,
        pid: null,
        rpcPort: null,
        startedAt: null,
      };
    });

    child.once("exit", (code, signal) => this.handleProcessExit(code, signal));

    try {
      await waitForChildSpawn(child);
    } catch {
      return;
    }

    const client = new Aria2RpcClient({
      endpoint: `http://127.0.0.1:${rpcPort}/jsonrpc`,
      secret,
    });
    this.client = client;

    try {
      await waitForRpcReady(client, this.rpcReadyTimeoutMs);
    } catch (error) {
      this.client = null;
      this.status = {
        availability: "unavailable",
        message: [
          `aria2 RPC did not become ready: ${
            error instanceof Error ? error.message : String(error)
          }`,
          formatProcessOutput(this.recentProcessOutput),
        ]
          .filter(Boolean)
          .join(" "),
        pid: null,
        rpcPort: null,
        startedAt: null,
      };
      child.kill();
      return;
    }

    if (this.isShuttingDown) {
      await this.shutdown();
      return;
    }

    this.restartAttempts = 0;
    this.status = {
      availability: "ready",
      message: null,
      pid: child.pid ?? null,
      rpcPort,
      startedAt: new Date().toISOString(),
    };
  }

  async saveSession(): Promise<void> {
    if (!this.client || this.status.availability !== "ready") {
      return;
    }

    await this.client.saveSession();
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    const child = this.process;

    if (!child) {
      return;
    }

    try {
      await this.saveSession();
      await this.client?.shutdown();
    } catch {
      child.kill();
    }

    const exited = await waitForProcessExit(child, this.shutdownTimeoutMs);

    if (!exited && child.exitCode === null) {
      child.kill();
      await waitForProcessExit(child, 1000);
    }
  }

  private handleProcessExit(
    code: number | null,
    signal: NodeJS.Signals | null,
  ): void {
    this.client = null;
    this.process = null;
    const canRetry =
      !this.isShuttingDown &&
      this.lastStartOptions !== null &&
      this.restartAttempts < this.maxRestartAttempts;

    this.status = {
      availability: canRetry ? "starting" : "unavailable",
      message: [
        `aria2 exited${code === null ? "" : ` with code ${code}`}${
          signal ? ` and signal ${signal}` : ""
        }.${canRetry ? " Restarting runtime." : ""}`,
        formatProcessOutput(this.recentProcessOutput),
      ]
        .filter(Boolean)
        .join(" "),
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
  }
}

function attachProcessOutput(
  child: ChildProcessWithoutNullStreams,
  append: (chunk: string) => void,
): void {
  child.stdout.on("data", (data: Buffer | string) => append(String(data)));
  child.stderr.on("data", (data: Buffer | string) => append(String(data)));
}

function appendRecentOutput(output: string[], chunk: string): void {
  const normalized = chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  output.push(...normalized);

  if (output.length > 8) {
    output.splice(0, output.length - 8);
  }
}

function formatProcessOutput(output: string[]): string | null {
  if (output.length === 0) {
    return null;
  }

  return `aria2 output: ${output.join(" ")}`;
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
    if (isReservedRuntimeOption(key)) {
      continue;
    }

    args.push(`--${key}=${value}`);
  }

  return args;
}

function buildRuntimeGlobalOptions(
  options: Aria2RuntimeStartOptions,
): Record<string, string> {
  const globalOptions: Record<string, string> = {
    dir: options.downloadDirectory,
    "max-concurrent-downloads": String(options.maxConcurrentDownloads),
    "max-connection-per-server": String(options.connectionsPerTask),
  };

  if (options.globalDownloadLimit !== null) {
    globalOptions["max-overall-download-limit"] = String(
      options.globalDownloadLimit,
    );
  } else {
    globalOptions["max-overall-download-limit"] = "0";
  }

  if (options.globalUploadLimit !== null) {
    globalOptions["max-overall-upload-limit"] = String(
      options.globalUploadLimit,
    );
  } else {
    globalOptions["max-overall-upload-limit"] = "0";
  }

  if (options.proxyUrl) {
    globalOptions["all-proxy"] = options.proxyUrl;
  } else {
    globalOptions["all-proxy"] = "";
  }

  for (const [key, value] of Object.entries(options.advancedAria2Options)) {
    if (isReservedRuntimeOption(key)) {
      continue;
    }

    globalOptions[key] = value;
  }

  return globalOptions;
}

function isReservedRuntimeOption(key: string): boolean {
  return key === "enable-rpc" || key.startsWith("rpc-");
}

function waitForChildSpawn(
  child: ChildProcessWithoutNullStreams,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (child.spawnfile) {
      resolve();
      return;
    }

    child.once("spawn", resolve);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      reject(
        new Error(
          `aria2 exited before spawn completed${
            code === null ? "" : ` with code ${code}`
          }${signal ? ` and signal ${signal}` : ""}.`,
        ),
      );
    });
  });
}

async function waitForRpcReady(
  client: Aria2RpcClient,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await client.call({ method: "aria2.getVersion" });
      return;
    } catch (error) {
      lastError = error;
      await delay(120);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("timeout");
}

function waitForProcessExit(
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve(true);
      return;
    }

    const timeout = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);

    const onExit = (): void => {
      clearTimeout(timeout);
      resolve(true);
    };

    child.once("exit", onExit);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
