import type {
  AddDownloadBatchInput,
  AddDownloadBatchItemResult,
  AddDownloadBatchResult,
  AddDownloadInput,
  RemoveDownloadOptions,
  TaskSnapshot,
} from "@shared/types";
import { shell } from "electron";
import { createReadStream } from "node:fs";
import { access, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import type { Aria2Runtime } from "../aria2";
import type { AppStore } from "../persistence";
import type { Aria2Task } from "./aria2-types";
import {
  type FollowedTaskMigration,
  planFollowedTaskMigrations,
} from "./followed-task-planning";
import {
  normalizeDownloadSource,
  prepareDownloadBatch,
} from "./source-normalization";
import { parseDownloadInput } from "./task-input";
import { createTaskSnapshot } from "./task-projection";

export class DownloadManager {
  private readonly observedTasks = new Map<string, TaskLogCheckpoint>();
  private readonly hashingTasks = new Set<string>();

  constructor(
    private readonly runtime: Aria2Runtime,
    private readonly store: AppStore,
  ) {}

  async add(input: AddDownloadInput): Promise<{ gid: string }> {
    const parsed = await parseDownloadInput(input, this.store.getSettings());
    const gid = await this.enqueueParsedDownload(parsed);

    this.store.upsertTaskMetadata({
      gid,
      notificationGeneration: 0,
      source: parsed.originalSource,
      displayName: input.fileName?.trim() || null,
      directory: parsed.options.dir ?? null,
      userNote: null,
      removeFilesOnDelete: false,
    });
    this.store.appendTaskLog(gid, `任务已创建：${parsed.displaySource}`);

    return { gid };
  }

  async addBatch(
    input: AddDownloadBatchInput,
  ): Promise<AddDownloadBatchResult> {
    const items: AddDownloadBatchItemResult[] = [];

    for (const prepared of prepareDownloadBatch(input.sources)) {
      if (prepared.status !== "ready") {
        items.push(prepared);
        continue;
      }

      try {
        const result = await this.add({
          source: prepared.source,
          directory: input.directory,
        });
        items.push({
          source: prepared.source,
          status: "created",
          gid: result.gid,
        });
      } catch (caught) {
        items.push({
          source: prepared.source,
          status: "failed",
          error: getErrorMessage(caught),
        });
      }
    }

    return {
      items,
      createdCount: items.filter((item) => item.status === "created").length,
      failedCount: items.filter((item) => item.status === "failed").length,
      skippedCount: items.filter((item) => item.status === "skipped").length,
    };
  }

  async pause(gid: string): Promise<void> {
    await this.runtime.getClient().pause(gid);
    this.store.appendTaskLog(gid, "已请求暂停任务。");
  }

  async resume(gid: string): Promise<void> {
    await this.runtime.getClient().unpause(gid);
    this.store.appendTaskLog(gid, "已请求继续任务。");
  }

  async pauseAll(): Promise<void> {
    const tasks = await this.getRawTasks();
    await Promise.all(
      tasks
        .filter((task) => task.status === "active")
        .map((task) => this.runtime.getClient().pause(task.gid)),
    );
  }

  async resumeAll(): Promise<void> {
    const tasks = await this.getRawTasks();
    await Promise.all(
      tasks
        .filter((task) => task.status === "paused")
        .map((task) => this.runtime.getClient().unpause(task.gid)),
    );
  }

  async remove(
    gid: string,
    options: RemoveDownloadOptions = {},
  ): Promise<void> {
    const client = this.runtime.getClient();
    const task = await this.findTask(gid);
    const metadataBeforeRemoval = this.store.getTaskMetadata(gid);
    const projectedBeforeRemoval =
      task && metadataBeforeRemoval
        ? createTaskSnapshot(
            [task],
            [metadataBeforeRemoval],
            this.runtime.getStatus(),
          ).tasks[0]
        : metadataBeforeRemoval?.persistedTask;
    const isActiveTask =
      task?.status === "active" ||
      task?.status === "waiting" ||
      task?.status === "paused";

    if (isActiveTask) {
      try {
        await client.remove(gid);
      } catch {
        try {
          await client.forceRemove(gid);
        } catch {
          throw new Error("任务删除失败，请稍后重试。");
        }
      }
    }

    try {
      await client.removeDownloadResult(gid);
    } catch {
      if (!isActiveTask && task) {
        throw new Error("任务记录删除失败，请稍后重试。");
      }
    }

    const metadata = this.store.getTaskMetadata(gid);
    const removeFiles = options.removeFiles ?? metadata?.removeFilesOnDelete;

    if (metadata) {
      this.store.upsertTaskMetadata({
        ...metadata,
        removeFilesOnDelete: removeFiles ?? metadata.removeFilesOnDelete,
      });
      this.store.appendTaskLog(gid, "任务已从列表移除。");
      if (projectedBeforeRemoval) {
        this.store.persistTaskSnapshot({
          ...projectedBeforeRemoval,
          state: "removed",
          downloadSpeed: 0,
          uploadSpeed: 0,
          connections: 0,
          remainingSeconds: null,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (removeFiles && task?.files) {
      try {
        await Promise.all(
          task.files
            .filter((file) => file.path)
            .map((file) => rm(file.path, { force: true, recursive: false })),
        );
      } catch {
        throw new Error(
          "任务已移除，但部分文件无法删除，请检查文件是否正被其他程序占用。",
        );
      }
    }
  }

  async retry(gid: string): Promise<{ gid: string }> {
    const metadata = this.store.getTaskMetadata(gid);

    if (!metadata) {
      throw new Error("无法重试任务，未找到任务元数据。");
    }

    await this.remove(gid, { removeFiles: false });

    const parsed = await parseDownloadInput(
      {
        source: metadata.source,
        directory: metadata.directory ?? undefined,
        fileName: metadata.displayName ?? undefined,
      },
      this.store.getSettings(),
    );
    const nextGid = await this.enqueueParsedDownload(parsed, gid);

    this.store.upsertTaskMetadata({
      ...metadata,
      gid: nextGid,
      notificationGeneration: metadata.notificationGeneration + 1,
      createdAt: metadata.createdAt,
    });
    this.store.appendTaskLog(nextGid, `已重新创建任务，来源任务：${gid}`);

    return {
      gid: nextGid,
    };
  }

  private async enqueueParsedDownload(
    parsed: Awaited<ReturnType<typeof parseDownloadInput>>,
    preferredGid?: string,
  ): Promise<string> {
    const client = this.runtime.getClient();
    const options = preferredGid
      ? {
          ...parsed.options,
          gid: preferredGid,
        }
      : parsed.options;

    return parsed.kind === "uri"
      ? client.addUri([parsed.source], options)
      : parsed.kind === "torrent"
        ? client.addTorrent(parsed.contentBase64, options)
        : client.addMetalink(parsed.contentBase64, options);
  }

  async clearAll(): Promise<void> {
    const tasks = await this.getRawTasks();

    const results = await Promise.allSettled(
      tasks.map((task) => this.remove(task.gid, { removeFiles: false })),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        this.store.removeTaskMetadata(tasks[index].gid);
      }
    });

    const taskGids = new Set(tasks.map((task) => task.gid));
    for (const metadata of this.store.listTaskMetadata()) {
      if (!taskGids.has(metadata.gid)) {
        this.store.removeTaskMetadata(metadata.gid);
      }
    }

    throwIfBatchFailed(results, "删除", "任务");
  }

  async clearCompleted(): Promise<void> {
    const tasks = await this.getRawTasks();
    const completed = tasks.filter((task) => task.status === "complete");

    const results = await Promise.allSettled(
      completed.map((task) => this.remove(task.gid, { removeFiles: false })),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        this.store.removeTaskMetadata(completed[index].gid);
      }
    });

    const rawGids = new Set(tasks.map((task) => task.gid));
    for (const metadata of this.store.listTaskMetadata()) {
      const isRestoredCompleted =
        !rawGids.has(metadata.gid) &&
        (metadata.persistedTask?.state === "completed" ||
          metadata.logLines.some((line) => line.includes("下载完成。")));

      if (isRestoredCompleted) {
        this.store.removeTaskMetadata(metadata.gid);
      }
    }
    throwIfBatchFailed(results, "删除", "已完成任务");
  }

  async deleteHistoryRecord(gid: string): Promise<void> {
    const metadata = this.store.getTaskMetadata(gid);

    if (metadata?.persistedTask?.state !== "completed") {
      throw new Error("仅支持删除已完成的历史记录。");
    }

    await this.runtime
      .getClient()
      .removeDownloadResult(gid)
      .catch(() => undefined);
    this.store.removeTaskMetadata(gid);
    this.observedTasks.delete(gid);
    this.hashingTasks.delete(gid);
  }

  async retryFailed(): Promise<void> {
    const tasks = await this.getRawTasks();
    const failed = tasks.filter((task) => task.status === "error");

    const results = await Promise.allSettled(
      failed.map((task) => this.retry(task.gid)),
    );
    throwIfBatchFailed(results, "重试", "失败任务");
  }

  async revealFile(gid: string): Promise<void> {
    const task = await this.findTask(gid);
    const filePath = task?.files?.find((file) => file.path)?.path;

    if (!filePath) {
      throw new Error("该任务暂无可打开的下载文件路径。");
    }

    await assertPathAccessible(filePath);
    shell.showItemInFolder(filePath);
  }

  async revealFolder(gid: string): Promise<void> {
    const task = await this.findTask(gid);
    const filePath = task?.files?.find((file) => file.path)?.path;
    const metadata = this.store.getTaskMetadata(gid);
    const folder = filePath ? dirname(filePath) : metadata?.directory;

    if (!folder) {
      throw new Error("该任务暂无可打开的下载目录。");
    }

    await assertPathAccessible(folder);
    const openError = await shell.openPath(folder);

    if (openError) {
      throw new Error(openError);
    }
  }

  async getSnapshot(): Promise<TaskSnapshot> {
    const client = this.runtime.getClient();
    const [active, waiting, stopped] = await Promise.all([
      client.tellActive<Aria2Task>(),
      client.tellWaiting<Aria2Task>(),
      client.tellStopped<Aria2Task>(),
    ]);
    const tasks = [...active, ...waiting, ...stopped];
    const { migrations, visibleTasks } = planFollowedTaskMigrations(tasks);
    this.migrateFollowedTaskMetadata(migrations);
    this.observeTaskLogs(visibleTasks);

    const snapshot = createTaskSnapshot(
      visibleTasks,
      this.store.listTaskMetadata(),
      this.runtime.getStatus(),
    );
    for (const task of snapshot.tasks) {
      if (
        task.state === "completed" ||
        task.state === "failed" ||
        task.state === "removed"
      ) {
        this.store.persistTaskSnapshot(task);
      }

      if (task.state === "completed") {
        void this.ensureTaskHashes(task);
      }
    }

    return snapshot;
  }

  private async ensureTaskHashes(
    task: TaskSnapshot["tasks"][number],
  ): Promise<void> {
    if (
      this.hashingTasks.has(task.gid) ||
      task.files.length === 0 ||
      task.files.every(
        (file) =>
          file.sha256Status === "available" ||
          file.sha256Status === "unavailable",
      )
    ) {
      return;
    }

    this.hashingTasks.add(task.gid);

    try {
      for (const file of task.files) {
        if (
          file.sha256Status === "available" ||
          file.sha256Status === "unavailable"
        ) {
          continue;
        }

        this.updateFileHash(task.gid, file.index, null, "calculating");

        try {
          const sha256 = await calculateSha256(file.path);
          this.updateFileHash(task.gid, file.index, sha256, "available");
        } catch {
          this.updateFileHash(task.gid, file.index, null, "unavailable");
        }
      }
    } finally {
      this.hashingTasks.delete(task.gid);
    }
  }

  private updateFileHash(
    gid: string,
    fileIndex: number,
    sha256: string | null,
    sha256Status: "calculating" | "available" | "unavailable",
  ): void {
    const metadata = this.store.getTaskMetadata(gid);
    const persistedTask = metadata?.persistedTask;

    if (!metadata || !persistedTask) {
      return;
    }

    this.store.persistTaskSnapshot({
      ...persistedTask,
      files: persistedTask.files.map((file) =>
        file.index === fileIndex ? { ...file, sha256, sha256Status } : file,
      ),
    });
  }

  private migrateFollowedTaskMetadata(
    migrations: FollowedTaskMigration[],
  ): void {
    for (const migration of migrations) {
      const parentMetadata = this.store.getTaskMetadata(migration.parentGid);

      if (!parentMetadata) {
        continue;
      }

      for (const childGid of migration.childGids) {
        if (this.store.getTaskMetadata(childGid)) {
          continue;
        }

        this.store.upsertTaskMetadata({
          ...parentMetadata,
          gid: childGid,
          displayName: null,
          logLines: parentMetadata.logLines,
        });
        this.store.appendTaskLog(
          childGid,
          `已跟随远程描述文件，来源：${getSafeDisplaySource(parentMetadata.source)}`,
        );
      }

      this.store.removeTaskMetadata(migration.parentGid);
      this.observedTasks.delete(migration.parentGid);
    }
  }

  private async findTask(gid: string): Promise<Aria2Task | null> {
    const snapshot = await this.getRawTasks();
    return snapshot.find((task) => task.gid === gid) ?? null;
  }

  private async getRawTasks(): Promise<Aria2Task[]> {
    const client = this.runtime.getClient();
    const [active, waiting, stopped] = await Promise.all([
      client.tellActive<Aria2Task>(),
      client.tellWaiting<Aria2Task>(),
      client.tellStopped<Aria2Task>(),
    ]);

    return [...active, ...waiting, ...stopped];
  }

  private observeTaskLogs(tasks: Aria2Task[]): void {
    for (const task of tasks) {
      const metadata = this.store.getTaskMetadata(task.gid);

      if (!metadata) {
        continue;
      }

      const checkpoint = this.observedTasks.get(task.gid);
      const status = describeAria2Status(task);
      const progress = getProgressPercent(task);
      const progressCheckpoint = Math.floor(progress / 5) * 5;
      const totalLength = parseByteCount(task.totalLength);
      const completedLength = parseByteCount(task.completedLength);
      const downloadSpeed = parseByteCount(task.downloadSpeed);

      if (!checkpoint || checkpoint.status !== task.status) {
        this.store.appendTaskLog(task.gid, `任务状态：${status}`);
      }

      if (
        task.status === "complete" &&
        (!checkpoint || checkpoint.status !== "complete")
      ) {
        this.store.appendTaskLog(task.gid, "下载完成。");
      }

      if (
        task.status === "error" &&
        (!checkpoint || checkpoint.errorMessage !== task.errorMessage)
      ) {
        this.store.appendTaskLog(
          task.gid,
          `下载失败：${task.errorMessage ?? task.errorCode ?? "未知错误"}`,
        );
      }

      if (!checkpoint || progressCheckpoint !== checkpoint.progressCheckpoint) {
        this.store.appendTaskLog(
          task.gid,
          `下载进度 ${Math.round(progress)}%（${formatBytes(
            completedLength,
          )} / ${formatBytes(totalLength)}），速度 ${formatBytes(
            downloadSpeed,
          )}/s。`,
        );
      }

      this.observedTasks.set(task.gid, {
        errorMessage: task.errorMessage ?? null,
        progressCheckpoint,
        status: task.status,
      });
    }
  }
}

function calculateSha256(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

interface TaskLogCheckpoint {
  errorMessage: string | null;
  progressCheckpoint: number;
  status: Aria2Task["status"];
}

function throwIfBatchFailed(
  results: PromiseSettledResult<unknown>[],
  action: string,
  target: string,
): void {
  const failedCount = results.filter(
    (result) => result.status === "rejected",
  ).length;

  if (failedCount > 0) {
    throw new Error(`有 ${failedCount} 个${target}${action}失败，请稍后重试。`);
  }
}

function describeAria2Status(task: Aria2Task): string {
  switch (task.status) {
    case "active":
      return "下载中";
    case "waiting":
      return "等待中";
    case "paused":
      return "暂停";
    case "complete":
      return "已完成";
    case "error":
      return "下载失败";
    case "removed":
      return "已移除";
  }
}

function getProgressPercent(task: Aria2Task): number {
  const totalLength = parseByteCount(task.totalLength);
  const completedLength = parseByteCount(task.completedLength);

  if (totalLength <= 0) {
    return 0;
  }

  return Math.min(100, (completedLength / totalLength) * 100);
}

function parseByteCount(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBytes(value: number): string {
  if (value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024)),
  );

  return `${(value / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${
    units[unitIndex]
  }`;
}

async function assertPathAccessible(path: string): Promise<void> {
  try {
    await access(path);
  } catch {
    throw new Error(`路径不可访问：${path}`);
  }
}

function getErrorMessage(caught: unknown): string {
  if (caught instanceof Error && caught.message) {
    return caught.message;
  }

  return "创建下载任务失败，请稍后重试。";
}

function getSafeDisplaySource(source: string): string {
  try {
    return normalizeDownloadSource(source).displaySource;
  } catch {
    return "已保存的下载来源";
  }
}
