import { app, BrowserWindow, nativeTheme } from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc/register";
import { Aria2Runtime } from "./services/aria2";
import { AppStore } from "./services/persistence";

let mainWindow: BrowserWindow | null = null;
const aria2Runtime = new Aria2Runtime();

function createMainWindow(): void {
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

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  const appStore = new AppStore();
  registerIpcHandlers(aria2Runtime, appStore);
  await aria2Runtime.start(appStore.getSettings());
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void aria2Runtime.shutdown();
});
