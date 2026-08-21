import type {
  DownloadTask,
  DownloadTaskMetadata,
  DownloadTaskState,
  RuntimeStatus,
  TaskSnapshot,
  TransferSummary,
} from "@shared/types";
import type { Aria2File, Aria2Task } from "./aria2-types";
import { statSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeDownloadSource,
  redactDownloadSource,
} from "./source-normalization";

export function createTaskSnapshot(
  rawTasks: Aria2Task[],
  metadata: DownloadTaskMetadata[],
  runtime: RuntimeStatus,
): TaskSnapshot {
  const metadataByGid = new Map(metadata.map((item) => [item.gid, item]));
  const liveTasks = rawTasks.map((task) =>
    projectTask(task, metadataByGid.get(task.gid)),
  );
  const rawGids = new Set(rawTasks.map((task) => task.gid));
  const restoredTasks = metadata
    .filter((item) => !rawGids.has(item.gid))
    .map(restorePersistedTask)
    .filter((task): task is DownloadTask => task !== null);
  const tasks = [...liveTasks, ...restoredTasks];
  const taskIndexByGid = new Map(
    rawTasks.map((task, index) => [task.gid, index]),
  );

  return {
    tasks: tasks.sort((left, right) => {
      const createdDiff =
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime();

      if (createdDiff !== 0) {
        return createdDiff;
      }

      return (
        (taskIndexByGid.get(left.gid) ?? 0) -
        (taskIndexByGid.get(right.gid) ?? 0)
      );
    }),
    summary: createTransferSummary(tasks),
    runtime,
    capturedAt: new Date().toISOString(),
  };
}

function restorePersistedTask(
  metadata: DownloadTaskMetadata,
): DownloadTask | null {
  if (metadata.persistedTask) {
    return repairPersistedFileInformation({
      ...metadata.persistedTask,
      logLines: [...metadata.logLines],
    });
  }

  if (!metadata.logLines.some((line) => line.includes("下载完成。"))) {
    return null;
  }

  return repairPersistedFileInformation({
    gid: metadata.gid,
    source: getSafeSource(metadata.source),
    directory: metadata.directory,
    name: metadata.displayName ?? inferNameFromSource(metadata.source),
    state: "completed",
    progress: 100,
    totalLength: null,
    completedLength: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    connections: 0,
    remainingSeconds: null,
    files: createFallbackFiles(metadata),
    errorMessage: null,
    logLines: [...metadata.logLines],
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
  });
}

function createFallbackFiles(
  metadata: DownloadTaskMetadata,
): DownloadTask["files"] {
  const name = metadata.displayName ?? inferNameFromSource(metadata.source);
  const path = metadata.directory ? join(metadata.directory, name) : "";

  return path
    ? [
        {
          index: 1,
          path,
          length: 0,
          completedLength: 0,
          selected: true,
          type: getFileType(path),
          sha256: null,
          sha256Status: "pending",
        },
      ]
    : [];
}

function repairPersistedFileInformation(task: DownloadTask): DownloadTask {
  const files = (
    task.files.length > 0
      ? task.files
      : createFallbackFiles({
          gid: task.gid,
          notificationGeneration: 0,
          source: task.source,
          displayName: task.name,
          directory: task.directory,
          logLines: task.logLines,
          userNote: null,
          removeFilesOnDelete: false,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        })
  ).map((file) => {
    let length = file.length;

    if (length <= 0 && file.path) {
      try {
        length = statSync(file.path).size;
      } catch {
        // Keep the historical record even if the local file is unavailable.
      }
    }

    return {
      ...file,
      length,
      completedLength:
        task.state === "completed" && length > 0
          ? length
          : file.completedLength,
      type: file.type ?? getFileType(file.path),
      sha256: file.sha256 ?? null,
      sha256Status:
        file.sha256Status ?? (file.sha256 ? "available" : "pending"),
    };
  });
  const completedLength = files.reduce(
    (total, file) => total + file.completedLength,
    0,
  );
  const totalLength = files.reduce((total, file) => total + file.length, 0);

  return {
    ...task,
    files,
    completedLength: completedLength || task.completedLength,
    totalLength: totalLength || task.totalLength,
  };
}

function inferNameFromSource(source: string): string {
  const safeSource = getSafeSource(source);

  try {
    const pathname = new URL(safeSource).pathname;
    return decodeURIComponent(pathname.split("/").at(-1) || safeSource);
  } catch {
    return safeSource;
  }
}

function projectTask(
  task: Aria2Task,
  metadata: DownloadTaskMetadata | undefined,
): DownloadTask {
  const totalLength = parseByteCount(task.totalLength);
  const completedLength = parseByteCount(task.completedLength);
  const downloadSpeed = parseByteCount(task.downloadSpeed);
  const progress =
    totalLength > 0 ? Math.min(100, (completedLength / totalLength) * 100) : 0;
  const remainingBytes = Math.max(0, totalLength - completedLength);

  return {
    gid: task.gid,
    source: metadata ? getSafeSource(metadata.source) : task.gid,
    directory: metadata?.directory ?? null,
    name: metadata?.displayName ?? inferTaskName(task, metadata),
    state: projectTaskState(task),
    progress,
    totalLength: totalLength > 0 ? totalLength : null,
    completedLength,
    downloadSpeed,
    uploadSpeed: parseByteCount(task.uploadSpeed),
    connections: Number.parseInt(task.connections || "0", 10),
    remainingSeconds:
      downloadSpeed > 0 && remainingBytes > 0
        ? Math.ceil(remainingBytes / downloadSpeed)
        : null,
    files: (task.files ?? []).map((file) =>
      projectFile(
        file,
        metadata?.persistedTask?.files.find(
          (persisted) => persisted.path === file.path,
        ),
      ),
    ),
    errorMessage: task.errorMessage ?? null,
    logLines: metadata?.logLines ?? [],
    createdAt: metadata?.createdAt ?? new Date().toISOString(),
    updatedAt:
      metadata?.persistedTask?.state === projectTaskState(task)
        ? metadata.persistedTask.updatedAt
        : new Date().toISOString(),
  };
}

function projectTaskState(task: Aria2Task): DownloadTaskState {
  if (
    task.status === "active" &&
    task.bittorrent &&
    task.totalLength === task.completedLength &&
    parseByteCount(task.uploadSpeed) > 0
  ) {
    return "seeding";
  }

  switch (task.status) {
    case "active":
      return "active";
    case "waiting":
      return "queued";
    case "paused":
      return "paused";
    case "complete":
      return "completed";
    case "error":
      return "failed";
    case "removed":
      return "removed";
  }
}

function projectFile(
  file: Aria2File,
  persisted?: DownloadTask["files"][number],
) {
  return {
    index: Number.parseInt(file.index, 10),
    path: file.path,
    length: parseByteCount(file.length),
    completedLength: parseByteCount(file.completedLength),
    selected: file.selected === "true",
    type: getFileType(file.path),
    sha256: persisted?.sha256 ?? null,
    sha256Status: persisted?.sha256Status ?? "pending",
  };
}

function getFileType(path: string): string {
  const extension = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toUpperCase();
  return extension ? `${extension} 文件` : "未知类型";
}

function createTransferSummary(tasks: DownloadTask[]): TransferSummary {
  return tasks.reduce<TransferSummary>(
    (summary, task) => {
      if (task.state === "active" || task.state === "seeding") {
        summary.activeCount += 1;
      }

      if (task.state === "queued") {
        summary.queuedCount += 1;
      }

      if (task.state === "completed") {
        summary.completedCount += 1;
      }

      if (task.state === "failed") {
        summary.failedCount += 1;
      }

      summary.downloadSpeed += task.downloadSpeed;
      summary.uploadSpeed += task.uploadSpeed;
      return summary;
    },
    {
      activeCount: 0,
      queuedCount: 0,
      completedCount: 0,
      failedCount: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
    },
  );
}

function inferTaskName(
  task: Aria2Task,
  metadata: DownloadTaskMetadata | undefined,
): string {
  const firstPath = task.files?.find((file) => file.path)?.path;

  if (firstPath) {
    return firstPath.split(/[\\/]/).at(-1) || task.gid;
  }

  if (metadata?.source) {
    return getSafeSource(metadata.source);
  }

  return task.gid;
}

function getSafeSource(source: string): string {
  try {
    return normalizeDownloadSource(source).displaySource;
  } catch {
    return redactDownloadSource(source);
  }
}

function parseByteCount(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
