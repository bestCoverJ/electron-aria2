import { ipcMain } from "electron";
import type { AddDownloadInput, AppSettings } from "@shared/types";
import type { Aria2Runtime } from "../services/aria2";
import { ipcChannels } from "./channels";
import {
  createDefaultSettings,
  createEmptyTaskSnapshot,
} from "../services/app-state";

let settings = createDefaultSettings();

export function getCurrentSettings(): AppSettings {
  return settings;
}

export function registerIpcHandlers(runtime: Aria2Runtime): void {
  ipcMain.handle(ipcChannels.settingsGet, () => settings);

  ipcMain.handle(
    ipcChannels.settingsUpdate,
    (_event, patch: Partial<AppSettings>) => {
      settings = { ...settings, ...patch };
      return settings;
    },
  );

  ipcMain.handle(ipcChannels.runtimeGetStatus, () => runtime.getStatus());

  ipcMain.handle(ipcChannels.downloadsGetSnapshot, () =>
    createEmptyTaskSnapshot(runtime.getStatus()),
  );

  ipcMain.handle(
    ipcChannels.downloadsAdd,
    (_event, input: AddDownloadInput) => {
      if (!input.source.trim()) {
        throw new Error("Download source is required.");
      }

      runtime.getClient();
      throw new Error("Download task creation is not implemented yet.");
    },
  );

  ipcMain.handle(ipcChannels.downloadsPause, () => {
    throw new Error("Download controls are not implemented yet.");
  });

  ipcMain.handle(ipcChannels.downloadsResume, () => {
    throw new Error("Download controls are not implemented yet.");
  });

  ipcMain.handle(ipcChannels.downloadsRemove, () => {
    throw new Error("Download controls are not implemented yet.");
  });
}
