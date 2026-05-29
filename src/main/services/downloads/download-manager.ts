import type {
  AddDownloadInput,
  RemoveDownloadOptions,
  TaskSnapshot,
} from "@shared/types";
import { shell } from "electron";
import { access, rm } from "node:fs/promises";
import { dirname } from "node:path";
import type { Aria2Runtime } from "../aria2";
import type { AppStore } from "../persistence";
import type { Aria2Task } from "./aria2-types";
import { parseDownloadInput } from "./task-input";
import { createTaskSnapshot } from "./task-projection";

export class DownloadManager {
  constructor(
    private readonly runtime: Aria2Runtime,
    private readonly store: AppStore,
  ) {}

  async add(input: AddDownloadInput): Promise<{ gid: string }> {
    const parsed = await parseDownloadInput(input, this.store.getSettings());
    const gid = await this.enqueueParsedDownload(parsed);

    this.store.upsertTaskMetadata({
      gid,
      source: parsed.source,
      displayName: null,
      directory: parsed.options.dir ?? null,
      userNote: null,
      removeFilesOnDelete: false,
    });

    return { gid };
  }

  async pause(gid: string): Promise<void> {
    await this.runtime.getClient().pause(gid);
  }

  async resume(gid: string): Promise<void> {
    await this.runtime.getClient().unpause(gid);
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

    try {
      await client.remove(gid);
    } catch {
      try {
        await client.forceRemove(gid);
      } catch {
        // Stopped results are cleared through removeDownloadResult below.
      }
    }

    try {
      await client.removeDownloadResult(gid);
    } catch {
      // aria2 only keeps completed/error results in the result list.
    }

    const metadata = this.store.getTaskMetadata(gid);
    const removeFiles = options.removeFiles ?? metadata?.removeFilesOnDelete;

    if (metadata) {
      this.store.upsertTaskMetadata({
        ...metadata,
        removeFilesOnDelete: removeFiles ?? metadata.removeFilesOnDelete,
      });
    }

    if (removeFiles && task?.files) {
      await Promise.all(
        task.files
          .filter((file) => file.path)
          .map((file) => rm(file.path, { force: true, recursive: false })),
      );
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
      },
      this.store.getSettings(),
    );
    const nextGid = await this.enqueueParsedDownload(parsed, gid);

    this.store.upsertTaskMetadata({
      ...metadata,
      gid: nextGid,
      createdAt: metadata.createdAt,
    });

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

    await Promise.allSettled(
      tasks.map((task) => this.remove(task.gid, { removeFiles: false })),
    );

    for (const metadata of this.store.listTaskMetadata()) {
      this.store.removeTaskMetadata(metadata.gid);
    }
  }

  async clearCompleted(): Promise<void> {
    const tasks = await this.getRawTasks();
    const completed = tasks.filter((task) => task.status === "complete");

    await Promise.allSettled(
      completed.map((task) => this.remove(task.gid, { removeFiles: false })),
    );
  }

  async retryFailed(): Promise<void> {
    const tasks = await this.getRawTasks();
    const failed = tasks.filter((task) => task.status === "error");

    await Promise.allSettled(failed.map((task) => this.retry(task.gid)));
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

    return createTaskSnapshot(
      [...active, ...waiting, ...stopped],
      this.store.listTaskMetadata(),
      this.runtime.getStatus(),
    );
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
}

async function assertPathAccessible(path: string): Promise<void> {
  try {
    await access(path);
  } catch {
    throw new Error(`路径不可访问：${path}`);
  }
}
