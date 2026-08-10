import { app } from "electron";
import type { AppSettings, RuntimeStatus, TaskSnapshot } from "@shared/types";

export function createDefaultSettings(): AppSettings {
  return {
    downloadDirectory: app.getPath("downloads"),
    recentDownloadDirectories: [app.getPath("downloads")],
    maxConcurrentDownloads: 3,
    connectionsPerTask: 8,
    globalDownloadLimit: null,
    globalUploadLimit: null,
    proxyUrl: null,
    theme: "system",
    shutdownBehavior: "ask",
    advancedAria2Options: {},
  };
}

export function createInitialRuntimeStatus(): RuntimeStatus {
  return {
    availability: "unavailable",
    message: "下载引擎尚未初始化。",
    pid: null,
    rpcPort: null,
    startedAt: null,
  };
}

export function createEmptyTaskSnapshot(runtime: RuntimeStatus): TaskSnapshot {
  return {
    tasks: [],
    summary: {
      activeCount: 0,
      queuedCount: 0,
      completedCount: 0,
      failedCount: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
    },
    runtime,
    capturedAt: new Date().toISOString(),
  };
}
