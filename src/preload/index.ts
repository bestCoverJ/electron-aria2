import { contextBridge, ipcRenderer } from "electron";
import { ipcChannels } from "@shared/ipc";
import type {
  AddDownloadBatchInput,
  AddDownloadInput,
  AppSettings,
  ApplicationUpdateSnapshot,
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
  updates: {
    getSnapshot: () => ipcRenderer.invoke(ipcChannels.updatesGetSnapshot),
    check: () => ipcRenderer.invoke(ipcChannels.updatesCheck),
    download: () => ipcRenderer.invoke(ipcChannels.updatesDownload),
    install: () => ipcRenderer.invoke(ipcChannels.updatesInstall),
    onStatusChanged: (
      listener: (snapshot: ApplicationUpdateSnapshot) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        snapshot: ApplicationUpdateSnapshot,
      ): void => listener(snapshot);
      ipcRenderer.on(ipcChannels.updatesStatusChanged, handler);
      return () =>
        ipcRenderer.removeListener(ipcChannels.updatesStatusChanged, handler);
    },
  },
  downloads: {
    selectTaskFile: () =>
      ipcRenderer.invoke(ipcChannels.downloadsSelectTaskFile),
    selectTaskFiles: () =>
      ipcRenderer.invoke(ipcChannels.downloadsSelectTaskFiles),
    add: (input: AddDownloadInput) =>
      ipcRenderer.invoke(ipcChannels.downloadsAdd, input),
    addBatch: (input: AddDownloadBatchInput) =>
      ipcRenderer.invoke(ipcChannels.downloadsAddBatch, input),
    pause: (gid: string) => ipcRenderer.invoke(ipcChannels.downloadsPause, gid),
    resume: (gid: string) =>
      ipcRenderer.invoke(ipcChannels.downloadsResume, gid),
    remove: (gid: string, options?: { removeFiles?: boolean }) =>
      ipcRenderer.invoke(ipcChannels.downloadsRemove, gid, options),
    retry: (gid: string) => ipcRenderer.invoke(ipcChannels.downloadsRetry, gid),
    clearAll: () => ipcRenderer.invoke(ipcChannels.downloadsClearAll),
    clearCompleted: () =>
      ipcRenderer.invoke(ipcChannels.downloadsClearCompleted),
    deleteHistoryRecord: (gid: string) =>
      ipcRenderer.invoke(ipcChannels.downloadsDeleteHistoryRecord, gid),
    retryFailed: () => ipcRenderer.invoke(ipcChannels.downloadsRetryFailed),
    revealFile: (gid: string) =>
      ipcRenderer.invoke(ipcChannels.downloadsRevealFile, gid),
    revealFolder: (gid: string) =>
      ipcRenderer.invoke(ipcChannels.downloadsRevealFolder, gid),
    getSnapshot: () => ipcRenderer.invoke(ipcChannels.downloadsGetSnapshot),
  },
};

contextBridge.exposeInMainWorld("tide", tideApi);
