import { app, BrowserWindow } from "electron";
import electronUpdater, { type AppUpdater } from "electron-updater";
import { ipcChannels } from "@shared/ipc";
import type { ApplicationUpdateSnapshot } from "@shared/types";
import {
  appendFileSync,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";

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
      errorCode: null,
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
    this.updateSnapshot({
      phase: "checking",
      errorMessage: null,
      errorCode: null,
    });
    try {
      await this.updater.checkForUpdates();
    } catch (caught) {
      throw this.createPublicError(caught);
    }
    return this.getSnapshot();
  }

  async download(): Promise<ApplicationUpdateSnapshot> {
    this.assertPackaged();
    if (this.snapshot.phase !== "available") {
      throw new Error("当前没有可下载的更新。");
    }

    this.updateSnapshot({
      phase: "downloading",
      errorMessage: null,
      errorCode: null,
    });
    try {
      await this.updater.downloadUpdate();
    } catch (caught) {
      throw this.createPublicError(caught);
    }
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
      this.updateSnapshot({
        phase: "checking",
        errorMessage: null,
        errorCode: null,
      });
    });
    this.updater.on("update-available", (info) => {
      this.updateSnapshot({
        phase: "available",
        availableVersion: info.version,
        downloadPercent: null,
        transferredBytes: null,
        totalBytes: null,
        errorMessage: null,
        errorCode: null,
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
        errorCode: null,
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
        errorCode: null,
      });
    });
    this.updater.on("error", (error) => {
      this.recordError(error);
    });
  }

  private createPublicError(caught: unknown): Error {
    const updateError = this.recordError(toError(caught));
    return new Error(`${updateError.code}：${updateError.message}`);
  }

  private recordError(error: Error): { code: string; message: string } {
    const updateError = classifyUpdateError(error);
    writeUpdateErrorLog(updateError.code, error);
    this.updateSnapshot({
      phase: "error",
      errorCode: updateError.code,
      errorMessage: updateError.message,
    });
    return updateError;
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

function toError(caught: unknown): Error {
  return caught instanceof Error ? caught : new Error(String(caught));
}

function classifyUpdateError(error: Error): { code: string; message: string } {
  const detail = error.message.toLowerCase();
  if (detail.includes("latest.yml") || detail.includes("404")) {
    return { code: "UPD-002", message: "更新文件尚未发布，请稍后重试。" };
  }
  if (/enotfound|econn|network|timeout/.test(detail)) {
    return { code: "UPD-001", message: "无法连接更新服务，请检查网络后重试。" };
  }
  if (/signature|certificate|sha512|checksum/.test(detail)) {
    return { code: "UPD-004", message: "更新包验证失败，请等待新版本发布。" };
  }
  if (/download|write|disk|space/.test(detail)) {
    return {
      code: "UPD-003",
      message: "更新包下载失败，请检查磁盘空间后重试。",
    };
  }
  return { code: "UPD-005", message: "更新服务暂时不可用，请稍后重试。" };
}

function writeUpdateErrorLog(code: string, error: Error): void {
  try {
    const logPath = join(app.getPath("userData"), "logs", "updater.log");
    mkdirSync(dirname(logPath), { recursive: true });
    try {
      if (statSync(logPath).size >= 1024 * 1024) {
        rmSync(`${logPath}.1`, { force: true });
        renameSync(logPath, `${logPath}.1`);
      }
    } catch {
      // The first log entry has no existing file to rotate.
    }
    appendFileSync(
      logPath,
      `[${new Date().toISOString()}] ${code} ${error.stack ?? error.message}\n`,
      "utf8",
    );
  } catch {
    // Logging failure must never interrupt the updater or application startup.
  }
}
