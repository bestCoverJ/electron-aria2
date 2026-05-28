import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const app = await readFile("src/renderer/src/App.tsx", "utf8");
const css = await readFile("src/renderer/src/styles/globals.css", "utf8");
const designSystem = await readFile("design-system/MASTER.md", "utf8");
const mainSource = await readFile("src/main/index.ts", "utf8");
const downloaderDir = "src/renderer/src/components/downloader";
const downloaderFiles = await readdir(downloaderDir);
const downloaderSource = (
  await Promise.all(
    downloaderFiles
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .map((file) => readFile(join(downloaderDir, file), "utf8")),
  )
).join("\n");
const uiSource = `${app}\n${downloaderSource}`;

const checks = [
  {
    name: "React hooks are used for renderer state",
    pass: app.includes("useMemo") && app.includes("useState"),
  },
  {
    name: "Four-screen shell layout exists",
    pass:
      uiSource.includes(
        'type MainView = "downloads" | "history" | "trash" | "settings"',
      ) &&
      app.includes("AppSidebar") &&
      app.includes("WorkspacePanel") &&
      app.includes("DetailsPanel") &&
      app.includes("StatusBar"),
  },
  {
    name: "Compact mode restores on double-click without sidebar controls",
    pass:
      app.includes("isCompactMode") &&
      app.includes("exitCompactMode") &&
      uiSource.includes("onDoubleClick={() => void handleExpand()}") &&
      uiSource.includes("当前下载总进度") &&
      !uiSource.includes("Compact</Button>") &&
      !uiSource.includes('label="Connected"'),
  },
  {
    name: "shadcn-style primitives and Lucide icons are used",
    pass:
      uiSource.includes("@/components/ui/button") &&
      uiSource.includes("@/components/ui/progress") &&
      uiSource.includes("lucide-react"),
  },
  {
    name: "Accessible labels and visible focus states exist",
    pass:
      uiSource.includes("aria-label") &&
      uiSource.includes("aria-modal") &&
      uiSource.includes("focus-visible:ring") &&
      css.includes("--ring"),
  },
  {
    name: "No horizontal overflow on the app shell",
    pass:
      app.includes("overflow-hidden") &&
      app.includes("min-w-0") &&
      app.includes("max-[860px]:grid-cols"),
  },
  {
    name: "Blue and white visual system is defined",
    pass:
      css.includes("--background: 0 0% 100%") &&
      css.includes("--primary: 229 82% 55%") &&
      designSystem.includes("#2f54eb"),
  },
  {
    name: "Reduced motion preference is respected",
    pass: css.includes("prefers-reduced-motion"),
  },
  {
    name: "Source Han Sans typography is the design-system default",
    pass:
      css.includes("Source Han Sans SC") &&
      designSystem.includes("Source Han Sans"),
  },
  {
    name: "Directory picker and history controls exist",
    pass:
      uiSource.includes("DirectoryField") &&
      uiSource.includes("selectDirectory") &&
      uiSource.includes("recentDownloadDirectories") &&
      designSystem.includes("recent directory"),
  },
  {
    name: "Settings are rendered as a first-class screen",
    pass:
      uiSource.includes("SettingsWorkspace") &&
      uiSource.includes("下载引擎") &&
      uiSource.includes("默认保存目录") &&
      uiSource.includes("速度限制"),
  },
  {
    name: "Detail panel exposes transfer tabs",
    pass:
      uiSource.includes(
        'type DetailTab = "overview" | "files" | "peers" | "log"',
      ) &&
      uiSource.includes("OverviewDetails") &&
      uiSource.includes("FilesDetails") &&
      uiSource.includes("PeersDetails") &&
      uiSource.includes("LogDetails"),
  },
  {
    name: "Bottom status bar exposes progress speed and engine state",
    pass:
      uiSource.includes("StatusBar") &&
      uiSource.includes("总进度") &&
      uiSource.includes("速度") &&
      uiSource.includes("引擎连接成功") &&
      uiSource.includes("引擎加载失败") &&
      uiSource.includes("SpeedWaveform") &&
      uiSource.includes("totalSpeed <= 0"),
  },
  {
    name: "Electron preload points to the built MJS bundle",
    pass: mainSource.includes('../preload/index.mjs"'),
  },
  {
    name: "Download API errors are normalized",
    pass:
      uiSource.includes("normalizeUserError") &&
      (await readFile("src/renderer/src/lib/tide-api.ts", "utf8")).includes(
        "Cannot read properties of undefined",
      ),
  },
  {
    name: "Shell glass is restrained for readability",
    pass:
      css.includes(".shell-glass") &&
      css.includes("backdrop-filter") &&
      designSystem.includes("Main content remains white"),
  },
];

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failed.length > 0) {
  throw new Error(`${failed.length} UI contract check(s) failed.`);
}

console.log("UI contract verification passed.");
