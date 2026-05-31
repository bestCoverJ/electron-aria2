import { app, BrowserWindow, type Rectangle } from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc/register";
import { Aria2Runtime } from "./services/aria2";
import { DesktopIntegration } from "./services/desktop";
import { getAppIconPath } from "./services/desktop/tray-icon";
import { DownloadManager } from "./services/downloads";
import { AppStore } from "./services/persistence";

installBrokenPipeGuards();

let mainWindow: BrowserWindow | null = null;
const aria2Runtime = new Aria2Runtime();
let desktopIntegration: DesktopIntegration | null = null;
let isRecreatingWindow = false;
let isQuitFinalized = false;
let currentWindowMode: "full" | "compact" = "full";
let lastFullBounds: Rectangle | null = null;

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.exit(0);
}

function createMainWindow(
  mode: "full" | "compact" = currentWindowMode,
): BrowserWindow {
  currentWindowMode = mode;
  const isCompact = mode === "compact";
  const bounds = isCompact
    ? { width: 420, height: 240 }
    : (lastFullBounds ?? { width: 760, height: 480 });

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: "x" in bounds ? bounds.x : undefined,
    y: "y" in bounds ? bounds.y : undefined,
    minWidth: isCompact ? 360 : 760,
    minHeight: isCompact ? 200 : 480,
    title: "Tide X",
    icon: getAppIconPath(),
    autoHideMenuBar: true,
    frame: !isCompact,
    resizable: !isCompact,
    minimizable: !isCompact,
    maximizable: !isCompact,
    backgroundColor: "#00000000",
    backgroundMaterial: process.platform === "win32" ? "mica" : undefined,
    vibrancy: process.platform === "darwin" ? "sidebar" : undefined,
    visualEffectState: process.platform === "darwin" ? "active" : undefined,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.openDevTools();

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  applyWindowBackdrop(mainWindow);

  mainWindow.on("close", (event) => {
    if (isRecreatingWindow) {
      return;
    }

    void desktopIntegration?.handleWindowClose(event);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    const suffix = isCompact ? "#compact" : "";
    mainWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}${suffix}`);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: isCompact ? "compact" : "",
    });
  }

  return mainWindow;
}

function applyWindowBackdrop(window: BrowserWindow): void {
  if (process.platform === "win32") {
    window.setBackgroundMaterial("mica");
    return;
  }

  if (process.platform === "darwin") {
    window.setVibrancy("sidebar");
  }
}

function installBrokenPipeGuards(): void {
  const ignoreBrokenPipe = (error: Error): void => {
    if (!isBrokenPipeError(error)) {
      throw error;
    }
  };

  process.stdout.on("error", ignoreBrokenPipe);
  process.stderr.on("error", ignoreBrokenPipe);
  process.on("uncaughtException", (error) => {
    if (isBrokenPipeError(error)) {
      return;
    }

    process.removeAllListeners("uncaughtException");
    throw error;
  });
}

function isBrokenPipeError(error: Error): boolean {
  return "code" in error && (error as NodeJS.ErrnoException).code === "EPIPE";
}

function recreateMainWindow(mode: "full" | "compact"): void {
  const previousWindow = mainWindow;
  isRecreatingWindow = true;
  previousWindow?.removeAllListeners("close");
  previousWindow?.close();
  isRecreatingWindow = false;
  createMainWindow(mode);
}

function enterCompactMode(): void {
  if (!mainWindow || currentWindowMode === "compact") {
    return;
  }

  lastFullBounds = mainWindow.getBounds();
  recreateMainWindow("compact");
}

function exitCompactMode(): void {
  if (currentWindowMode === "full") {
    return;
  }

  recreateMainWindow("full");
}

app.whenReady().then(async () => {
  const appStore = new AppStore();
  const downloads = new DownloadManager(aria2Runtime, appStore);
  registerIpcHandlers(aria2Runtime, appStore, downloads, {
    enterCompactMode,
    exitCompactMode,
  });
  await aria2Runtime.start(appStore.getSettings());
  desktopIntegration = new DesktopIntegration(
    () => mainWindow,
    downloads,
  );
  desktopIntegration.initialize();
  createMainWindow();

  app.on("second-instance", () => {
    if (mainWindow?.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow?.show();
    mainWindow?.focus();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !desktopIntegration) {
    app.quit();
  }
});

app.on("before-quit", (event) => {
  if (isQuitFinalized) {
    return;
  }

  event.preventDefault();
  desktopIntegration?.beginQuit();
  void aria2Runtime.shutdown().finally(() => {
    isQuitFinalized = true;
    app.quit();
  });
});
