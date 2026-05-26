import { app } from "electron";
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

export interface Aria2RuntimePaths {
  binaryPath: string;
  dataDirectory: string;
  sessionFile: string;
  rpcSecretFile: string;
}

function getRuntimeBinaryName(): string {
  return process.platform === "win32" ? "aria2c.exe" : "aria2c";
}

function getRuntimePlatformDirectory(): string {
  return `${process.platform}-${process.arch}`;
}

export function resolveAria2RuntimePaths(): Aria2RuntimePaths {
  const runtimeRoot = app.isPackaged
    ? join(process.resourcesPath, "aria2")
    : join(app.getAppPath(), "resources", "aria2");
  const dataDirectory = join(app.getPath("userData"), "aria2");

  return {
    binaryPath: join(
      runtimeRoot,
      getRuntimePlatformDirectory(),
      getRuntimeBinaryName(),
    ),
    dataDirectory,
    sessionFile: join(dataDirectory, "session.txt"),
    rpcSecretFile: join(dataDirectory, "rpc-secret"),
  };
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureAria2DataFiles(
  paths: Aria2RuntimePaths,
): Promise<void> {
  await mkdir(paths.dataDirectory, { recursive: true });

  if (!(await pathExists(paths.sessionFile))) {
    await writeFile(paths.sessionFile, "", "utf8");
  }
}
