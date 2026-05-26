import type { DownloadTaskState, TaskSnapshot } from "@shared/types";
import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  Notification,
  Tray,
  type MessageBoxOptions,
} from "electron";
import type { DownloadManager } from "../downloads";
import type { AppStore } from "../persistence";
import { createTrayIcon } from "./tray-icon";

export class DesktopIntegration {
  private tray: Tray | null = null;
  private notificationInterval: NodeJS.Timeout | null = null;
  private notifiedTasks = new Set<string>();
  private isQuitting = false;

  constructor(
    private readonly getWindow: () => BrowserWindow | null,
    private readonly downloads: DownloadManager,
    private readonly store: AppStore,
  ) {}

  initialize(): void {
    if (process.platform === "win32") {
      app.setAppUserModelId("com.tidex.app");
    }

    this.createTray();
    this.startNotificationWatcher();
  }

  async handleWindowClose(event: Electron.Event): Promise<void> {
    if (this.isQuitting) {
      return;
    }

    event.preventDefault();

    const settings = this.store.getSettings();
    const hasActiveDownloads = await this.hasActiveDownloads();

    if (!hasActiveDownloads && settings.shutdownBehavior === "quit") {
      this.quit();
      return;
    }

    if (settings.shutdownBehavior === "ask" && hasActiveDownloads) {
      await this.showCloseChoice();
      return;
    }

    this.hideToTray();
  }

  quit(): void {
    this.beginQuit();
    app.quit();
  }

  beginQuit(): void {
    this.isQuitting = true;
    this.stopNotificationWatcher();
  }

  private createTray(): void {
    this.tray = new Tray(createTrayIcon());
    this.tray.setToolTip("Tide X");
    this.tray.on("double-click", () => this.showWindow());
    this.updateTrayMenu();
  }

  private updateTrayMenu(snapshot?: TaskSnapshot): void {
    if (!this.tray) {
      return;
    }

    const activeCount = snapshot?.summary.activeCount ?? 0;
    const queuedCount = snapshot?.summary.queuedCount ?? 0;

    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "显示 Tide X",
          click: () => this.showWindow(),
        },
        {
          label: `活动任务 ${activeCount}，等待 ${queuedCount}`,
          enabled: false,
        },
        { type: "separator" },
        {
          label: "暂停全部",
          click: () => {
            void this.downloads.pauseAll().then(() => this.refreshTrayMenu());
          },
        },
        {
          label: "继续全部",
          click: () => {
            void this.downloads.resumeAll().then(() => this.refreshTrayMenu());
          },
        },
        { type: "separator" },
        {
          label: "退出",
          click: () => this.quit(),
        },
      ]),
    );
  }

  private async refreshTrayMenu(): Promise<void> {
    try {
      this.updateTrayMenu(await this.downloads.getSnapshot());
    } catch {
      this.updateTrayMenu();
    }
  }

  private showWindow(): void {
    const window = this.getWindow();

    if (!window) {
      return;
    }

    if (window.isMinimized()) {
      window.restore();
    }

    window.show();
    window.focus();
  }

  private hideToTray(): void {
    this.getWindow()?.hide();
  }

  private async showCloseChoice(): Promise<void> {
    const window = this.getWindow();
    const options: MessageBoxOptions = {
      type: "question",
      buttons: ["最小化到托盘", "退出", "取消"],
      defaultId: 0,
      cancelId: 2,
      title: "Tide X",
      message: "仍有下载任务在运行",
      detail: "你可以让 Tide X 留在托盘继续下载，或直接退出应用。",
    };
    const result = window
      ? await dialog.showMessageBox(window, options)
      : await dialog.showMessageBox(options);

    if (result.response === 0) {
      this.hideToTray();
      return;
    }

    if (result.response === 1) {
      this.quit();
    }
  }

  private startNotificationWatcher(): void {
    if (!Notification.isSupported()) {
      return;
    }

    this.notificationInterval = setInterval(() => {
      void this.checkTaskNotifications();
    }, 3000);
  }

  private stopNotificationWatcher(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }

  private async checkTaskNotifications(): Promise<void> {
    try {
      const snapshot = await this.downloads.getSnapshot();
      this.updateTrayMenu(snapshot);

      for (const task of snapshot.tasks) {
        if (!shouldNotify(task.state) || this.notifiedTasks.has(task.gid)) {
          continue;
        }

        this.notifiedTasks.add(task.gid);
        const notification = new Notification({
          title: task.state === "completed" ? "下载完成" : "下载失败",
          body:
            task.state === "completed"
              ? task.name
              : `${task.name}${task.errorMessage ? `：${task.errorMessage}` : ""}`,
        });
        notification.on("click", () => {
          this.showWindow();
          if (task.state === "completed") {
            void this.downloads.revealFile(task.gid).catch(() => undefined);
          }
        });
        notification.show();
      }
    } catch {
      this.updateTrayMenu();
    }
  }

  private async hasActiveDownloads(): Promise<boolean> {
    try {
      const snapshot = await this.downloads.getSnapshot();
      return (
        snapshot.summary.activeCount > 0 || snapshot.summary.queuedCount > 0
      );
    } catch {
      return false;
    }
  }
}

function shouldNotify(state: DownloadTaskState): boolean {
  return state === "completed" || state === "failed";
}
