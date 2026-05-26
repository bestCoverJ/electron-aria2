import { ipcMain } from "electron";
import type { AddDownloadInput, AppSettings } from "@shared/types";
import type { Aria2Runtime } from "../services/aria2";
import type { DownloadManager } from "../services/downloads";
import type { AppStore } from "../services/persistence";
import { ipcChannels } from "./channels";
import { createEmptyTaskSnapshot } from "../services/app-state";

export function registerIpcHandlers(
  runtime: Aria2Runtime,
  store: AppStore,
  downloads: DownloadManager,
): void {
  ipcMain.handle(ipcChannels.settingsGet, () => store.getSettings());

  ipcMain.handle(
    ipcChannels.settingsUpdate,
    async (_event, patch: Partial<AppSettings>) => {
      const settings = await store.updateSettings(patch);
      await runtime.applySettings(settings);
      return settings;
    },
  );

  ipcMain.handle(ipcChannels.runtimeGetStatus, () => runtime.getStatus());

  ipcMain.handle(ipcChannels.downloadsGetSnapshot, async () => {
    if (runtime.getStatus().availability !== "ready") {
      return createEmptyTaskSnapshot(runtime.getStatus());
    }

    return downloads.getSnapshot();
  });

  ipcMain.handle(ipcChannels.downloadsAdd, (_event, input: AddDownloadInput) =>
    downloads.add(input),
  );

  ipcMain.handle(ipcChannels.downloadsPause, (_event, gid: string) => {
    return downloads.pause(gid);
  });

  ipcMain.handle(ipcChannels.downloadsResume, (_event, gid: string) => {
    return downloads.resume(gid);
  });

  ipcMain.handle(
    ipcChannels.downloadsRemove,
    (_event, gid: string, options?: { removeFiles?: boolean }) =>
      downloads.remove(gid, options),
  );

  ipcMain.handle(ipcChannels.downloadsRetry, (_event, gid: string) =>
    downloads.retry(gid),
  );

  ipcMain.handle(ipcChannels.downloadsRevealFile, (_event, gid: string) =>
    downloads.revealFile(gid),
  );

  ipcMain.handle(ipcChannels.downloadsRevealFolder, (_event, gid: string) =>
    downloads.revealFolder(gid),
  );
}
