import { contextBridge, ipcRenderer } from "electron";
import { ipcChannels } from "@shared/ipc";
import type {
  AddDownloadInput,
  AppSettings,
  SelectDirectoryOptions,
  TideApi,
} from "@shared/types";

const tideApi: TideApi = {
  appWindow: {
    enterCompactMode: () =>
      ipcRenderer.invoke(ipcChannels.windowEnterCompactMode),
    exitCompactMode: () =>
      ipcRenderer.invoke(ipcChannels.windowExitCompactMode),
  },
  settings: {
    get: () => ipcRenderer.invoke(ipcChannels.settingsGet),
    update: (patch: Partial<AppSettings>) =>
      ipcRenderer.invoke(ipcChannels.settingsUpdate, patch),
    selectDirectory: (options?: SelectDirectoryOptions) =>
      ipcRenderer.invoke(ipcChannels.settingsSelectDirectory, options),
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
    retry: (gid: string) => ipcRenderer.invoke(ipcChannels.downloadsRetry, gid),
    revealFile: (gid: string) =>
      ipcRenderer.invoke(ipcChannels.downloadsRevealFile, gid),
    revealFolder: (gid: string) =>
      ipcRenderer.invoke(ipcChannels.downloadsRevealFolder, gid),
    getSnapshot: () => ipcRenderer.invoke(ipcChannels.downloadsGetSnapshot),
  },
};

contextBridge.exposeInMainWorld("tide", tideApi);
