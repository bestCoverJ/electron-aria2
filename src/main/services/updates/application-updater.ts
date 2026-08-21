import { app, BrowserWindow } from "electron";
import electronUpdater, { type AppUpdater } from "electron-updater";
import { ipcChannels } from "@shared/ipc";
import type { ApplicationUpdateSnapshot } from "@shared/types";

const AUTO_CHECK_DELAY_MS = 10_000;
const { autoUpdater } = electronUpdater;

export class ApplicationUpdater {
  private readonly updater: AppUpdater;
  private autoCheckTimer: NodeJS.Timeout | null = null;
  private snapshot: ApplicationUpdateSnapshot;

  constructor(updater: AppUpdater = autoUpdater) {
    this.updater = updater;
    this.snapshot = {
      currentVersion: app.getVersion(),
      phase: app.isPackaged ? "idle" : "disabled",
      availableVersion: null,
      downloadPercent: null,
      transferredBytes: null,
      totalBytes: null,
      errorMessage: null,
    };

    this.updater.autoDownload = false;
    this.updater.autoInstallOnAppQuit = false;
    this.bindEvents();
  }

  getSnapshot(): ApplicationUpdateSnapshot {
    return { ...this.snapshot };
  }

  scheduleAutomaticCheck(delayMs = AUTO_CHECK_DELAY_MS): void {
    if (!app.isPackaged || this.autoCheckTimer) {
      return;
    }

    this.autoCheckTimer = setTimeout(() => {
      this.autoCheckTimer = null;
      void this.check().catch(() => undefined);
    }, delayMs);
  }

  async check(): Promise<ApplicationUpdateSnapshot> {
    this.assertPackaged();
    this.updateSnapshot({ phase: "checking", errorMessage: null });
    await this.updater.checkForUpdates();
    return this.getSnapshot();
  }

  async download(): Promise<ApplicationUpdateSnapshot> {
    this.assertPackaged();
    if (this.snapshot.phase !== "available") {
      throw new Error("当前没有可下载的更新。");
    }

    this.updateSnapshot({ phase: "downloading", errorMessage: null });
    await this.updater.downloadUpdate();
    return this.getSnapshot();
  }

  install(): void {
    this.assertPackaged();
    if (this.snapshot.phase !== "downloaded") {
      throw new Error("当前没有已下载的更新。");
    }

    this.updater.quitAndInstall(false, true);
  }

  dispose(): void {
    if (this.autoCheckTimer) {
      clearTimeout(this.autoCheckTimer);
      this.autoCheckTimer = null;
    }
  }

  private assertPackaged(): void {
    if (!app.isPackaged) {
      throw new Error("开发模式不访问应用更新源。");
    }
  }

  private bindEvents(): void {
    this.updater.on("checking-for-update", () => {
      this.updateSnapshot({ phase: "checking", errorMessage: null });
    });
    this.updater.on("update-available", (info) => {
      this.updateSnapshot({
        phase: "available",
        availableVersion: info.version,
        downloadPercent: null,
        transferredBytes: null,
        totalBytes: null,
        errorMessage: null,
      });
    });
    this.updater.on("update-not-available", () => {
      this.updateSnapshot({
        phase: "not-available",
        availableVersion: null,
        downloadPercent: null,
        transferredBytes: null,
        totalBytes: null,
        errorMessage: null,
      });
    });
    this.updater.on("download-progress", (progress) => {
      this.updateSnapshot({
        phase: "downloading",
        downloadPercent: progress.percent,
        transferredBytes: progress.transferred,
        totalBytes: progress.total,
      });
    });
    this.updater.on("update-downloaded", (info) => {
      this.updateSnapshot({
        phase: "downloaded",
        availableVersion: info.version,
        downloadPercent: 100,
        errorMessage: null,
      });
    });
    this.updater.on("error", (error) => {
      this.updateSnapshot({ phase: "error", errorMessage: error.message });
    });
  }

  private updateSnapshot(patch: Partial<ApplicationUpdateSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send(
          ipcChannels.updatesStatusChanged,
          this.getSnapshot(),
        );
      }
    }
  }
}
