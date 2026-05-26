import type {
  AddDownloadInput,
  RemoveDownloadOptions,
  TaskSnapshot,
} from "@shared/types";
import { shell } from "electron";
import { dirname } from "node:path";
import type { Aria2Runtime } from "../aria2";
import type { AppStore } from "../persistence";
import type { Aria2Task } from "./aria2-types";
import { rm } from "node:fs/promises";
import { parseDownloadInput } from "./task-input";
import { createTaskSnapshot } from "./task-projection";

export class DownloadManager {
  constructor(
    private readonly runtime: Aria2Runtime,
    private readonly store: AppStore,
  ) {}

  async add(input: AddDownloadInput): Promise<{ gid: string }> {
    const parsed = await parseDownloadInput(input, this.store.getSettings());
    const client = this.runtime.getClient();
    const gid =
      parsed.kind === "uri"
        ? await client.addUri([parsed.source], parsed.options)
        : parsed.kind === "torrent"
          ? await client.addTorrent(parsed.contentBase64, parsed.options)
          : await client.addMetalink(parsed.contentBase64, parsed.options);

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

  async remove(
    gid: string,
    options: RemoveDownloadOptions = {},
  ): Promise<void> {
    const client = this.runtime.getClient();
    const task = await this.findTask(gid);

    try {
      await client.remove(gid);
    } catch {
      await client.forceRemove(gid);
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
      throw new Error("Cannot retry task because its metadata was not found.");
    }

    return this.add({
      source: metadata.source,
      directory: metadata.directory ?? undefined,
    });
  }

  async revealFile(gid: string): Promise<void> {
    const task = await this.findTask(gid);
    const filePath = task?.files?.find((file) => file.path)?.path;

    if (!filePath) {
      throw new Error("No downloaded file path is available for this task.");
    }

    shell.showItemInFolder(filePath);
  }

  async revealFolder(gid: string): Promise<void> {
    const task = await this.findTask(gid);
    const filePath = task?.files?.find((file) => file.path)?.path;
    const metadata = this.store.getTaskMetadata(gid);
    const folder = filePath ? dirname(filePath) : metadata?.directory;

    if (!folder) {
      throw new Error("No download folder is available for this task.");
    }

    await shell.openPath(folder);
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
