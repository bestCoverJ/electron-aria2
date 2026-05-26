import { contextBridge, ipcRenderer } from "electron";
import { ipcChannels } from "@shared/ipc";
import type { AddDownloadInput, AppSettings, TideApi } from "@shared/types";

const tideApi: TideApi = {
  settings: {
    get: () => ipcRenderer.invoke(ipcChannels.settingsGet),
    update: (patch: Partial<AppSettings>) =>
      ipcRenderer.invoke(ipcChannels.settingsUpdate, patch),
  },
  runtime: {
    getStatus: () => ipcRenderer.invoke(ipcChannels.runtimeGetStatus),
  },
  downloads: {
    add: (input: AddDownloadInput) =>
      ipcRenderer.invoke(ipcChannels.downloadsAdd, input),
    pause: (gid: string) => ipcRenderer.invoke(ipcChannels.downloadsPause, gid),
    resume: (gid: string) =>
      ipcRenderer.invoke(ipcChannels.downloadsResume, gid),
    remove: (gid: string, options?: { removeFiles?: boolean }) =>
      ipcRenderer.invoke(ipcChannels.downloadsRemove, gid, options),
    getSnapshot: () => ipcRenderer.invoke(ipcChannels.downloadsGetSnapshot),
  },
};

contextBridge.exposeInMainWorld("tide", tideApi);
