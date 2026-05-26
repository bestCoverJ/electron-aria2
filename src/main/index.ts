import { app, BrowserWindow, nativeTheme } from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc/register";
import { Aria2Runtime } from "./services/aria2";
import { DesktopIntegration } from "./services/desktop";
import { DownloadManager } from "./services/downloads";
import { AppStore } from "./services/persistence";

let mainWindow: BrowserWindow | null = null;
const aria2Runtime = new Aria2Runtime();
let desktopIntegration: DesktopIntegration | null = null;

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "Tide X",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#042f2e" : "#f0fdfa",
    backgroundMaterial: process.platform === "win32" ? "mica" : undefined,
    vibrancy: process.platform === "darwin" ? "sidebar" : undefined,
    visualEffectState: process.platform === "darwin" ? "active" : undefined,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (event) => {
    void desktopIntegration?.handleWindowClose(event);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

app.whenReady().then(async () => {
  const appStore = new AppStore();
  const downloads = new DownloadManager(aria2Runtime, appStore);
  registerIpcHandlers(aria2Runtime, appStore, downloads);
  await aria2Runtime.start(appStore.getSettings());
  desktopIntegration = new DesktopIntegration(
    () => mainWindow,
    downloads,
    appStore,
  );
  desktopIntegration.initialize();
  createMainWindow();

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

app.on("before-quit", () => {
  desktopIntegration?.beginQuit();
  void aria2Runtime.shutdown();
});
