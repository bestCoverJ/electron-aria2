import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const app = await readFile("src/renderer/src/App.tsx", "utf8");
const css = await readFile("src/renderer/src/styles/globals.css", "utf8");
const designSystem = await readFile("design-system/MASTER.md", "utf8");
const mainSource = await readFile("src/main/index.ts", "utf8");
const desktopIntegrationSource = await readFile(
  "src/main/services/desktop/desktop-integration.ts",
  "utf8",
);
const ipcSource = await readFile("src/shared/ipc.ts", "utf8");
const ipcRegisterSource = await readFile("src/main/ipc/register.ts", "utf8");
const preloadSource = await readFile("src/preload/index.ts", "utf8");
const downloadsHookSource = await readFile(
  "src/renderer/src/hooks/use-downloads.ts",
  "utf8",
);
const downloadManagerSource = await readFile(
  "src/main/services/downloads/download-manager.ts",
  "utf8",
);
const taskInputSource = await readFile(
  "src/main/services/downloads/task-input.ts",
  "utf8",
);
const sourceNormalizationSource = await readFile(
  "src/main/services/downloads/source-normalization.ts",
  "utf8",
);
const statusBarSource = await readFile(
  "src/renderer/src/components/downloader/StatusBar.tsx",
  "utf8",
);
const detailsSource = await readFile(
  "src/renderer/src/components/downloader/DetailsPanel.tsx",
  "utf8",
);
const aboutSource = await readFile(
  "src/renderer/src/components/downloader/AboutWorkspace.tsx",
  "utf8",
);
const lockfileSource = await readFile("pnpm-lock.yaml", "utf8");
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
    name: "Task selection is keyboard accessible",
    pass:
      uiSource.includes("aria-pressed={selected}") &&
      uiSource.includes("onClick={() => onSelect(task.gid)}") &&
      uiSource.includes('type="button"'),
  },
  {
    name: "Empty filters provide a direct recovery action",
    pass:
      uiSource.includes('actionLabel="清除筛选"') ||
      (uiSource.includes('"清除筛选"') &&
        uiSource.includes('setStatusFilter("all")')),
  },
  {
    name: "Theme preference is applied to the renderer",
    pass:
      app.includes('matchMedia("(prefers-color-scheme: dark)")') &&
      app.includes('classList.toggle("dark"'),
  },
  {
    name: "Theme preference is synchronized with native dialogs",
    pass:
      mainSource.includes("nativeTheme.themeSource") &&
      ipcRegisterSource.includes("nativeTheme.themeSource = settings.theme"),
  },
  {
    name: "Action errors expose retry and dismissal",
    pass:
      uiSource.includes('aria-label="重试"') &&
      uiSource.includes('aria-label="关闭错误提示"') &&
      uiSource.includes("actions.clearError"),
  },
  {
    name: "Polling does not erase actionable operation errors",
    pass:
      downloadsHookSource.includes("void refresh(false)") &&
      downloadsHookSource.includes("clearErrorOnSuccess = true"),
  },
  {
    name: "New-download retry cannot duplicate an already-created task",
    pass:
      app.indexOf("await actions.updateSettings") <
      app.indexOf("await actions.add"),
  },
  {
    name: "Destructive bulk removal requires confirmation",
    pass:
      uiSource.includes("window.confirm") &&
      uiSource.includes("确定删除全部下载任务吗"),
  },
  {
    name: "Single-task removal defaults to preserving downloaded files",
    pass:
      uiSource.includes("同时删除已下载文件") &&
      uiSource.includes("默认仅从 TideX 中移除任务") &&
      uiSource.includes("删除任务和文件") &&
      uiSource.includes("remove(task.gid, removeFiles)"),
  },
  {
    name: "Task state maps to pause resume and retry actions",
    pass:
      uiSource.includes('task.state === "queued"') &&
      uiSource.includes("actions.pause(task.gid)") &&
      uiSource.includes("actions.resume(task.gid)") &&
      uiSource.includes("actions.retry(task.gid)"),
  },
  {
    name: "Batch failures are reported instead of silently discarded",
    pass:
      downloadManagerSource.includes("throwIfBatchFailed") &&
      downloadManagerSource.includes("个${target}${action}失败"),
  },
  {
    name: "Transfer logs are persisted only at progress checkpoints",
    pass:
      downloadManagerSource.includes(
        "progressCheckpoint !== checkpoint.progressCheckpoint",
      ) &&
      !downloadManagerSource.includes(
        "completedLength !== checkpoint.completedLength",
      ),
  },
  {
    name: "Task log uses a virtualized viewport",
    pass:
      detailsSource.includes("VirtualLogList") &&
      detailsSource.includes("startIndex") &&
      detailsSource.includes("endIndex") &&
      detailsSource.includes("ResizeObserver") &&
      detailsSource.includes("lines.slice(startIndex, endIndex)"),
  },
  {
    name: "Compact detail metrics expose full values through tooltips",
    pass:
      uiSource.includes("title={`${label}：${value}`}") &&
      uiSource.includes("text-[11px]") &&
      uiSource.includes("min-[1040px]:text-sm"),
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
    name: "Torrent and Metalink files have a multi-select native picker workflow",
    pass:
      uiSource.includes("选择文件") &&
      uiSource.includes("onSelectTaskFiles") &&
      ipcSource.includes("downloadsSelectTaskFiles") &&
      preloadSource.includes("downloadsSelectTaskFiles") &&
      ipcRegisterSource.includes('"multiSelections"') &&
      ipcRegisterSource.includes(
        'extensions: ["torrent", "metalink", "meta4"]',
      ),
  },
  {
    name: "Single direct downloads support a validated custom file name",
    pass:
      uiSource.includes("保存文件名") &&
      uiSource.includes("仅单条直链可用") &&
      app.includes("if (sources.length === 1 && fileName)") &&
      app.includes("fileName,") &&
      taskInputSource.includes("options.out = fileName") &&
      taskInputSource.includes(
        "自定义文件名仅适用于单条普通 HTTP/HTTPS/FTP/SFTP",
      ) &&
      downloadManagerSource.includes("displayName: input.fileName?.trim()"),
  },
  {
    name: "Mixed download sources use ordered batch IPC with per-item feedback",
    pass:
      ipcSource.includes("downloadsAddBatch") &&
      preloadSource.includes("addBatch") &&
      downloadsHookSource.includes("downloads.addBatch") &&
      app.includes("actions.addBatch") &&
      downloadManagerSource.includes("prepareDownloadBatch(input.sources)") &&
      uiSource.includes("failedItems") &&
      uiSource.includes("成功项已从输入框移除"),
  },
  {
    name: "Source field documents protocols and enforces the 100-item UI limit",
    pass:
      uiSource.includes("粘贴链接，每行一条") &&
      uiSource.includes("Thunder/FlashGet/QQDL") &&
      uiSource.includes("{sourceCount}/100") &&
      uiSource.includes("sources.length > 100") &&
      aboutSource.includes("暂不支持 ed2k、thunderx、迅雷云盘"),
  },
  {
    name: "Compact add dialog removes redundant help and fits the 760px layout",
    pass:
      uiSource.includes('panelClassName="p-4 [&>div:first-child]:mb-3"') &&
      uiSource.includes('className="flex flex-col gap-3"') &&
      uiSource.includes("h-24 min-h-24 max-h-32 resize-none") &&
      uiSource.includes("批量或任务文件将自动使用原始文件名") &&
      !uiSource.includes("已识别 {sources.length} 条非空来源") &&
      !uiSource.includes("留空时使用服务器提供的文件名。"),
  },
  {
    name: "Add dialog dims the workspace without backdrop blur",
    pass:
      uiSource.includes("blurBackdrop={false}") &&
      uiSource.includes('blurBackdrop && "backdrop-blur-sm"') &&
      uiSource.includes("bg-slate-950/35") &&
      !uiSource.includes(
        'className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"',
      ),
  },
  {
    name: "Remote descriptors follow in memory and displayed credentials are redacted",
    pass:
      taskInputSource.includes('options["follow-torrent"] = "mem"') &&
      taskInputSource.includes('options["follow-metalink"] = "mem"') &&
      sourceNormalizationSource.includes('url.username = ""') &&
      sourceNormalizationSource.includes('url.password = ""') &&
      downloadManagerSource.includes("planFollowedTaskMigrations"),
  },
  {
    name: "Settings are rendered as a first-class screen",
    pass:
      uiSource.includes("SettingsWorkspace") &&
      uiSource.includes("下载引擎") &&
      uiSource.includes("默认保存目录") &&
      uiSource.includes("速度限制") &&
      uiSource.includes("关闭行为"),
  },
  {
    name: "Window close behavior follows the user setting",
    pass:
      uiSource.includes('value="minimize-to-tray"') &&
      uiSource.includes('value="quit"') &&
      desktopIntegrationSource.includes("shutdownBehavior") &&
      desktopIntegrationSource.includes("dialog.showMessageBox") &&
      desktopIntegrationSource.includes("记住我的选择"),
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
    name: "760px status bar and task rows retain download speed",
    pass:
      statusBarSource.includes("max-[900px]:grid-cols") &&
      statusBarSource.includes("snapshot.summary.downloadSpeed") &&
      uiSource.includes("下载速度：${formatBytes(task.downloadSpeed)}/s") &&
      !statusBarSource.includes(
        'className="flex items-center gap-4 border-l px-4 max-[900px]:hidden"',
      ),
  },
  {
    name: "Electron preload points to the built MJS bundle",
    pass: mainSource.includes('../preload/index.mjs"'),
  },
  {
    name: "Developer tools do not open for customers by default",
    pass:
      mainSource.includes('process.env.TIDE_X_OPEN_DEVTOOLS === "1"') &&
      !mainSource.includes("\n  mainWindow.webContents.openDevTools();"),
  },
  {
    name: "First-run window uses the requested 760 by 520 size",
    pass:
      mainSource.includes("{ width: 760, height: 520 }") &&
      mainSource.includes("minHeight: isCompact ? 200 : 520"),
  },
  {
    name: "About page shows current dependency versions without stale notice",
    pass:
      aboutSource.includes("当前依赖版本") &&
      aboutSource.includes('version: "1.37.0"') &&
      aboutSource.includes('version: "33.4.11"') &&
      lockfileSource.includes("version: 33.4.11") &&
      !aboutSource.includes("aria2 的原始许可、作者和变更记录"),
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
