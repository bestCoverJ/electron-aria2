import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer as createNetServer } from "node:net";

const platformId = `${process.platform}-${process.arch}`;
const binaryName = process.platform === "win32" ? "aria2c.exe" : "aria2c";
const binaryPath = join(
  process.cwd(),
  "resources",
  "aria2",
  platformId,
  binaryName,
);

await access(
  binaryPath,
  process.platform === "win32" ? constants.F_OK : constants.X_OK,
);

const workspace = await mkdtemp(join(tmpdir(), "tide-x-flow-"));
const httpServer = await startFixtureServer();

let runtime = null;

try {
  runtime = await startAria2(workspace);

  const completeGid = await rpc(runtime, "aria2.addUri", [
    [`${httpServer.url}/complete.bin`],
    { "max-tries": "1", "retry-wait": "0" },
  ]);
  await waitForStatus(runtime, completeGid, "complete", 7000);

  const pauseGid = await rpc(runtime, "aria2.addUri", [
    [`${httpServer.url}/slow.bin`],
    { "max-tries": "1", "retry-wait": "0" },
  ]);
  await waitForStatus(runtime, pauseGid, "active", 5000);
  await rpc(runtime, "aria2.pause", [pauseGid]);
  await waitForStatus(runtime, pauseGid, "paused", 5000);
  await rpc(runtime, "aria2.unpause", [pauseGid]);
  await waitForStatus(runtime, pauseGid, "active", 5000);
  await rpc(runtime, "aria2.remove", [pauseGid]);
  await waitForStatus(runtime, pauseGid, "removed", 5000);

  const failGid = await rpc(runtime, "aria2.addUri", [
    [`${httpServer.url}/missing.bin`],
    { "max-tries": "1", "retry-wait": "0" },
  ]);
  await waitForStatus(runtime, failGid, "error", 8000);

  const recoveryGid = await rpc(runtime, "aria2.addUri", [
    [`${httpServer.url}/recovery.bin`],
    { "max-tries": "1", "retry-wait": "0" },
  ]);
  await waitForStatus(runtime, recoveryGid, "active", 5000);
  await rpc(runtime, "aria2.saveSession");
  await stopAria2(runtime);

  runtime = await startAria2(workspace);
  const recovered = await findTask(runtime, recoveryGid);

  if (!recovered) {
    throw new Error(
      "Restart recovery failed: aria2 did not reload the saved task.",
    );
  }

  await rpc(runtime, "aria2.forceRemove", [recoveryGid]).catch(() => undefined);

  const completedFile = join(workspace, "complete.bin");
  const completedStat = await stat(completedFile);

  if (completedStat.size === 0) {
    throw new Error("Completed download file is empty.");
  }

  await verifySettingsPersistenceContract();

  console.log(
    "download flow verification passed: add, pause, resume, remove, complete, fail, restart recovery",
  );
} finally {
  if (runtime) {
    await stopAria2(runtime).catch(() => undefined);
  }
  await httpServer.close();
  await removeWithRetry(workspace);
}

async function startAria2(directory) {
  const rpcPort = await getAvailablePort();
  const secret = randomBytes(16).toString("hex");
  const sessionFile = join(directory, "session.txt");
  await writeFile(sessionFile, "", { flag: "a" });

  const child = spawn(
    binaryPath,
    [
      "--enable-rpc=true",
      "--rpc-listen-all=false",
      `--rpc-listen-port=${rpcPort}`,
      `--rpc-secret=${secret}`,
      `--dir=${directory}`,
      `--input-file=${sessionFile}`,
      `--save-session=${sessionFile}`,
      "--save-session-interval=1",
      "--continue=true",
      "--allow-overwrite=true",
      "--auto-file-renaming=false",
      "--summary-interval=0",
      "--max-concurrent-downloads=2",
    ],
    { cwd: directory, windowsHide: true },
  );
  const stderr = [];
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
  const runtime = { child, port: rpcPort, secret, stopping: false };
  child.once("exit", (code, signal) => {
    if (!runtime.stopping && code !== 0 && code !== null) {
      console.error(
        `aria2 flow process exited with code ${code} ${signal ?? ""}`,
      );
      console.error(stderr.join("").trim());
    }
  });

  await waitForRpc(runtime);
  return runtime;
}

async function stopAria2(runtime) {
  runtime.stopping = true;

  if (runtime.child.exitCode === null) {
    await rpc(runtime, "aria2.shutdown").catch(() => runtime.child.kill());
  }

  const exited = await waitForChildExit(runtime.child, 10000);

  if (!exited && runtime.child.exitCode === null) {
    runtime.child.kill();
    await waitForChildExit(runtime.child, 3000);
  }
}

async function startFixtureServer() {
  const sockets = new Set();
  const server = createHttpServer((request, response) => {
    if (request.url === "/missing.bin") {
      response.writeHead(404);
      response.end("missing");
      return;
    }

    if (request.url === "/complete.bin") {
      const body = Buffer.alloc(64 * 1024, "t");
      response.writeHead(200, {
        "content-length": body.length,
        "content-type": "application/octet-stream",
      });
      response.end(body);
      return;
    }

    if (request.url === "/slow.bin" || request.url === "/recovery.bin") {
      streamSlowResponse(response);
      return;
    }

    response.writeHead(404);
    response.end("missing");
  });

  const port = await getAvailablePort();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        for (const socket of sockets) {
          socket.destroy();
        }
        server.close(resolve);
      }),
  };
}

function streamSlowResponse(response) {
  const chunks = 320;
  const chunk = Buffer.alloc(16 * 1024, "x");
  let sent = 0;

  response.writeHead(200, {
    "content-length": chunks * chunk.length,
    "content-type": "application/octet-stream",
  });

  const timer = setInterval(() => {
    if (sent >= chunks || response.destroyed) {
      clearInterval(timer);
      response.end();
      return;
    }

    response.write(chunk);
    sent += 1;
  }, 20);
}

async function waitForRpc(runtime) {
  const deadline = Date.now() + 5000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      await rpc(runtime, "aria2.getVersion");
      return;
    } catch (error) {
      lastError = error;
      await delay(100);
    }
  }

  throw new Error(
    `aria2 RPC did not become ready: ${lastError?.message ?? "timeout"}`,
  );
}

async function waitForStatus(runtime, gid, expectedStatus, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "unknown";

  while (Date.now() < deadline) {
    const task = await findTask(runtime, gid);
    lastStatus = task?.status ?? "missing";

    if (lastStatus === expectedStatus) {
      return task;
    }

    await delay(120);
  }

  throw new Error(
    `Expected ${gid} to become ${expectedStatus}, got ${lastStatus}.`,
  );
}

async function findTask(runtime, gid) {
  const methods = [
    ["aria2.tellActive", []],
    ["aria2.tellWaiting", [0, 100]],
    ["aria2.tellStopped", [0, 100]],
  ];

  for (const [method, params] of methods) {
    const tasks = await rpc(runtime, method, params);
    const task = tasks.find((item) => item.gid === gid);

    if (task) {
      return task;
    }
  }

  return null;
}

async function rpc(runtime, method, params = []) {
  const response = await fetch(`http://127.0.0.1:${runtime.port}/jsonrpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: randomUUID(),
      jsonrpc: "2.0",
      method,
      params: [`token:${runtime.secret}`, ...params],
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
    const server = createNetServer();
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForChildExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve(true);
      return;
    }

    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
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

  console.warn(
    `Unable to remove temporary directory ${path}: ${lastError?.message}`,
  );
}

async function verifySettingsPersistenceContract() {
  const source = await readFile(
    "src/main/services/persistence/app-store.ts",
    "utf8",
  );
  const validationSource = await readFile(
    "src/main/services/persistence/settings-validation.ts",
    "utf8",
  );
  const requiredSnippets = [
    "getSettings()",
    "updateSettings(patch",
    "recentDownloadDirectories",
    "normalizeSettingsPatch",
    "normalizeRecentDirectories",
    "readState()",
    "writeState()",
    "state.json",
    "writeFileSync",
  ];

  const combinedSource = `${source}\n${validationSource}`;

  for (const snippet of requiredSnippets) {
    if (!combinedSource.includes(snippet)) {
      throw new Error(`Settings persistence contract is missing: ${snippet}`);
    }
  }
}
