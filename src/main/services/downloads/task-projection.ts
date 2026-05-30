import type {
  DownloadTask,
  DownloadTaskMetadata,
  DownloadTaskState,
  RuntimeStatus,
  TaskSnapshot,
  TransferSummary,
} from "@shared/types";
import type { Aria2File, Aria2Task } from "./aria2-types";

export function createTaskSnapshot(
  rawTasks: Aria2Task[],
  metadata: DownloadTaskMetadata[],
  runtime: RuntimeStatus,
): TaskSnapshot {
  const metadataByGid = new Map(metadata.map((item) => [item.gid, item]));
  const tasks = rawTasks.map((task) =>
    projectTask(task, metadataByGid.get(task.gid)),
  );
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
    source: metadata?.source ?? task.gid,
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
    files: (task.files ?? []).map(projectFile),
    errorMessage: task.errorMessage ?? null,
    logLines: metadata?.logLines ?? [],
    createdAt: metadata?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

function projectFile(file: Aria2File) {
  return {
    index: Number.parseInt(file.index, 10),
    path: file.path,
    length: parseByteCount(file.length),
    completedLength: parseByteCount(file.completedLength),
    selected: file.selected === "true",
  };
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
    return metadata.source;
  }

  return task.gid;
}

function parseByteCount(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
