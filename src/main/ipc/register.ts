import { dialog, ipcMain, nativeTheme } from "electron";
import type {
  AddDownloadBatchInput,
  AddDownloadInput,
  AppSettings,
  SelectDirectoryOptions,
} from "@shared/types";
import type { Aria2Runtime } from "../services/aria2";
import type { DownloadManager } from "../services/downloads";
import type { AppStore } from "../services/persistence";
import type { ApplicationUpdater } from "../services/updates";
import { ipcChannels } from "./channels";
import { createEmptyTaskSnapshot } from "../services/app-state";

export function registerIpcHandlers(
  runtime: Aria2Runtime,
  store: AppStore,
  downloads: DownloadManager,
  applicationUpdater: ApplicationUpdater,
  windowControls: {
    enterCompactMode(): void;
    exitCompactMode(): void;
  },
): void {
  ipcMain.handle(ipcChannels.windowEnterCompactMode, () => {
    windowControls.enterCompactMode();
  });

  ipcMain.handle(ipcChannels.windowExitCompactMode, () => {
    windowControls.exitCompactMode();
  });

  ipcMain.handle(ipcChannels.settingsGet, () => store.getSettings());

  ipcMain.handle(
    ipcChannels.settingsUpdate,
    async (_event, patch: Partial<AppSettings>) => {
      const settings = await store.updateSettings(patch);
      nativeTheme.themeSource = settings.theme;
      await runtime.applySettings(settings);
      return settings;
    },
  );

  ipcMain.handle(
    ipcChannels.settingsSelectDirectory,
    async (_event, options?: SelectDirectoryOptions) => {
      const result = await dialog.showOpenDialog({
        title: "选择保存目录",
        defaultPath:
          options?.defaultPath || store.getSettings().downloadDirectory,
        properties: ["openDirectory", "createDirectory"],
      });

      return {
        canceled: result.canceled,
        path: result.canceled ? null : (result.filePaths[0] ?? null),
      };
    },
  );

  ipcMain.handle(ipcChannels.runtimeGetStatus, () => runtime.getStatus());

  ipcMain.handle(ipcChannels.updatesGetSnapshot, () =>
    applicationUpdater.getSnapshot(),
  );
  ipcMain.handle(ipcChannels.updatesCheck, () => applicationUpdater.check());
  ipcMain.handle(ipcChannels.updatesDownload, () =>
    applicationUpdater.download(),
  );
  ipcMain.handle(ipcChannels.updatesInstall, () =>
    applicationUpdater.install(),
  );

  ipcMain.handle(ipcChannels.downloadsSelectTaskFile, async () => {
    const result = await dialog.showOpenDialog({
      title: "选择 torrent 或 Metalink 文件",
      properties: ["openFile"],
      filters: [
        {
          name: "下载任务文件",
          extensions: ["torrent", "metalink", "meta4"],
        },
      ],
    });

    return {
      canceled: result.canceled,
      path: result.canceled ? null : (result.filePaths[0] ?? null),
    };
  });

  ipcMain.handle(ipcChannels.downloadsSelectTaskFiles, async () => {
    const result = await dialog.showOpenDialog({
      title: "选择 torrent 或 Metalink 文件",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "下载任务文件",
          extensions: ["torrent", "metalink", "meta4"],
        },
      ],
    });

    return {
      canceled: result.canceled,
      paths: result.canceled ? [] : result.filePaths,
    };
  });

  ipcMain.handle(ipcChannels.downloadsGetSnapshot, async () => {
    if (runtime.getStatus().availability !== "ready") {
      return createEmptyTaskSnapshot(runtime.getStatus());
    }

    return downloads.getSnapshot();
  });

  ipcMain.handle(ipcChannels.downloadsAdd, (_event, input: AddDownloadInput) =>
    downloads.add(input),
  );

  ipcMain.handle(
    ipcChannels.downloadsAddBatch,
    (_event, input: AddDownloadBatchInput) => downloads.addBatch(input),
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

  ipcMain.handle(ipcChannels.downloadsClearAll, () => downloads.clearAll());

  ipcMain.handle(ipcChannels.downloadsClearCompleted, () =>
    downloads.clearCompleted(),
  );

  ipcMain.handle(
    ipcChannels.downloadsDeleteHistoryRecord,
    (_event, gid: string) => downloads.deleteHistoryRecord(gid),
  );

  ipcMain.handle(ipcChannels.downloadsRetryFailed, () =>
    downloads.retryFailed(),
  );

  ipcMain.handle(ipcChannels.downloadsRevealFile, (_event, gid: string) =>
    downloads.revealFile(gid),
  );

  ipcMain.handle(ipcChannels.downloadsRevealFolder, (_event, gid: string) =>
    downloads.revealFolder(gid),
  );
}
