import type { DownloadTaskState, TaskSnapshot } from "@shared/types";
import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  Tray,
} from "electron";
import type { DownloadManager } from "../downloads";
import { createTrayIcon } from "./tray-icon";

export class DesktopIntegration {
  private tray: Tray | null = null;
  private notificationInterval: NodeJS.Timeout | null = null;
  private notifiedTasks = new Set<string>();
  private isQuitting = false;
  private hasShownBackgroundNotice = false;

  constructor(
    private readonly getWindow: () => BrowserWindow | null,
    private readonly downloads: DownloadManager,
  ) {}

  initialize(): void {
    if (process.platform === "win32") {
      app.setAppUserModelId("com.tidex.app");
    }

    this.createTray();
    this.startNotificationWatcher();
    void this.refreshTrayMenu();
  }

  async handleWindowClose(event: Electron.Event): Promise<void> {
    if (this.isQuitting) {
      return;
    }

    event.preventDefault();
    this.hideToTray();
    this.showBackgroundNotice();
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
          label: "退出 Tide X",
          click: () => this.quit(),
        },
      ]),
    );
  }

  private async refreshTrayMenu(): Promise<void> {
    try {
      const snapshot = await this.downloads.getSnapshot();
      this.updateTrayMenu(snapshot);
      this.updateTaskbarProgress(snapshot);
    } catch {
      this.updateTrayMenu();
      this.updateTaskbarProgress();
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

  private updateTaskbarProgress(snapshot?: TaskSnapshot): void {
    const window = this.getWindow();

    if (!window) {
      return;
    }

    window.setProgressBar(snapshot ? getTaskbarProgress(snapshot) : -1);
  }

  private showBackgroundNotice(): void {
    if (this.hasShownBackgroundNotice) {
      return;
    }

    this.hasShownBackgroundNotice = true;

    if (!Notification.isSupported()) {
      return;
    }

    new Notification({
      title: "Tide X",
      body: "应用在后台运行，请手动退出",
    }).show();
  }

  private startNotificationWatcher(): void {
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
      this.updateTaskbarProgress(snapshot);

      if (!Notification.isSupported()) {
        return;
      }

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
      this.updateTaskbarProgress();
    }
  }

}

function shouldNotify(state: DownloadTaskState): boolean {
  return state === "completed" || state === "failed";
}

function getTaskbarProgress(snapshot: TaskSnapshot): number {
  const activeTasks = snapshot.tasks.filter(
    (task) => task.state === "active" || task.state === "seeding",
  );

  if (activeTasks.length === 0) {
    return -1;
  }

  const totalBytes = activeTasks.reduce(
    (total, task) => total + (task.totalLength ?? 0),
    0,
  );

  if (totalBytes <= 0) {
    return 2;
  }

  const completedBytes = activeTasks.reduce(
    (total, task) => total + task.completedLength,
    0,
  );

  return Math.min(1, Math.max(0, completedBytes / totalBytes));
}
