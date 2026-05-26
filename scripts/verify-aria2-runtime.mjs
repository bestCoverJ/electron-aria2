import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createServer } from "node:net";

const platformId = `${process.platform}-${process.arch}`;
const binaryName = process.platform === "win32" ? "aria2c.exe" : "aria2c";
const root = process.env.TIDE_X_ARIA2_ROOT ?? join(process.cwd(), "resources", "aria2");
const binaryPath = join(root, platformId, binaryName);

await assertExecutable(binaryPath);

const workspace = await mkdtemp(join(tmpdir(), "tide-x-aria2-smoke-"));
const sessionFile = join(workspace, "session.txt");
await writeFile(sessionFile, "", "utf8");

const rpcPort = await getAvailablePort();
const secret = randomBytes(16).toString("hex");
const child = spawn(
  binaryPath,
  [
    "--enable-rpc=true",
    "--rpc-listen-all=false",
    `--rpc-listen-port=${rpcPort}`,
    `--rpc-secret=${secret}`,
    `--dir=${workspace}`,
    `--input-file=${sessionFile}`,
    `--save-session=${sessionFile}`,
    "--summary-interval=0",
  ],
  { cwd: workspace, windowsHide: true },
);
const stderr = [];
child.stderr.on("data", (chunk) => stderr.push(chunk.toString()));

try {
  child.once("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`aria2 smoke process exited with code ${code} ${signal ?? ""}`);
      console.error(stderr.join("").trim());
    }
  });

  const version = await waitForRpc(rpcPort, secret);
  await rpc(rpcPort, secret, "aria2.shutdown");
  await waitForExit(child);

  console.log(
    `aria2 runtime smoke passed: ${basename(binaryPath)} ${version.version} on ${platformId}`,
  );
} finally {
  if (!child.killed && child.exitCode === null) {
    child.kill();
  }
  await removeWithRetry(workspace);
}

async function assertExecutable(path) {
  const mode = process.platform === "win32" ? constants.F_OK : constants.X_OK;

  try {
    await access(path, mode);
  } catch {
    throw new Error(`aria2c binary is missing or not executable: ${path}`);
  }
}

async function waitForRpc(port, secret) {
  const deadline = Date.now() + 5000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      return await rpc(port, secret, "aria2.getVersion");
    } catch (error) {
      lastError = error;
      await delay(120);
    }
  }

  throw new Error(`aria2 RPC did not become ready: ${lastError?.message ?? "timeout"}`);
}

async function rpc(port, secret, method, params = []) {
  const response = await fetch(`http://127.0.0.1:${port}/jsonrpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: randomUUID(),
      jsonrpc: "2.0",
      method,
      params: [`token:${secret}`, ...params],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (payload.error) {
    throw new Error(payload.error.message);
  }

  return payload.result;
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Unable to allocate local port."));
        }
      });
    });
  });
}

function waitForExit(childProcess) {
  return new Promise((resolve) => {
    if (childProcess.exitCode !== null) {
      resolve();
      return;
    }

    childProcess.once("exit", resolve);
    setTimeout(resolve, 3000);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeWithRetry(path) {
  let lastError;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(path, { force: true, recursive: true });
      return;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  console.warn(`Unable to remove temporary directory ${path}: ${lastError?.message}`);
}
