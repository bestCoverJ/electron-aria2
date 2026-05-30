import type { DownloadTask, RuntimeStatus, TaskSnapshot } from "@shared/types";
import { Download, History, Settings, Trash2 } from "lucide-react";
import type { MainView } from "./types";

export type DownloadStatusFilter =
  | "all"
  | "not-started"
  | "active"
  | "paused"
  | "completed"
  | "failed"
  | "stopped";

export function getVisibleTasks(
  tasks: DownloadTask[],
  view: MainView,
  query: string,
  statusFilter: DownloadStatusFilter = "all",
): DownloadTask[] {
  const normalizedQuery = query.trim().toLowerCase();
  let scoped = tasks.filter((task) => {
    if (view === "history") {
      return task.state === "completed";
    }

    if (view === "trash") {
      return task.state === "removed";
    }

    if (view === "downloads") {
      return task.state !== "removed";
    }

    return false;
  });

  if (view === "downloads" && statusFilter !== "all") {
    scoped = scoped.filter((task) => matchesStatusFilter(task, statusFilter));
  }

  if (!normalizedQuery) {
    return scoped;
  }

  return scoped.filter(
    (task) =>
      task.name.toLowerCase().includes(normalizedQuery) ||
      task.files.some((file) =>
        file.path.toLowerCase().includes(normalizedQuery),
      ),
  );
}

export function getStatusFilterLabel(filter: DownloadStatusFilter): string {
  const labels: Record<DownloadStatusFilter, string> = {
    active: "进行中",
    all: "全部状态",
    completed: "已完成",
    failed: "下载失败",
    "not-started": "未开始",
    paused: "暂停",
    stopped: "停止下载",
  };

  return labels[filter];
}

function matchesStatusFilter(
  task: DownloadTask,
  filter: DownloadStatusFilter,
): boolean {
  switch (filter) {
    case "not-started":
      return task.state === "queued";
    case "active":
      return task.state === "active" || task.state === "seeding";
    case "paused":
      return task.state === "paused";
    case "completed":
      return task.state === "completed";
    case "failed":
      return task.state === "failed";
    case "stopped":
      return task.state === "removed";
    case "all":
      return true;
  }
}

export function getViewTitle(view: MainView): string {
  const labels: Record<MainView, string> = {
    downloads: "下载列表",
    history: "历史记录",
    trash: "垃圾箱",
    settings: "设置",
  };

  return labels[view];
}

export function getViewIcon(view: MainView): typeof Download {
  const icons: Record<MainView, typeof Download> = {
    downloads: Download,
    history: History,
    trash: Trash2,
    settings: Settings,
  };

  return icons[view];
}

export function getEmptyTitle(view: MainView): string {
  const titles: Record<MainView, string> = {
    downloads: "暂无下载任务",
    history: "暂无历史记录",
    trash: "垃圾箱为空",
    settings: "设置不可用",
  };

  return titles[view];
}

export function getEmptyMessage(view: MainView): string {
  const messages: Record<MainView, string> = {
    downloads: "添加 URL、Magnet、torrent 或 Metalink 任务开始下载。",
    history: "完成的下载任务会显示在这里。",
    trash: "删除的任务会显示在这里。",
    settings: "设置仍在加载。",
  };

  return messages[view];
}

const fileIconExtensions = new Set([
  "AEP",
  "AI",
  "AVI",
  "CSV",
  "DOC",
  "DOCX",
  "FIG",
  "IMG",
  "INDD",
  "JPG",
  "MKV",
  "MP3",
  "MP4",
  "MPEG",
  "PDF",
  "PNG",
  "PPT",
  "PPTX",
  "PSD",
  "RAR",
  "SVG",
  "TXT",
  "WAV",
  "XLS",
  "XLSX",
  "ZIP",
]);

const extensionAliases: Record<string, string> = {
  CSS: "Code",
  HTML: "Code",
  JS: "Code",
  JSX: "Code",
  JPEG: "JPG",
  JSON: "Code",
  M4A: "MP3",
  M4V: "MP4",
  MD: "TXT",
  RTF: "DOC",
  TS: "Code",
  TSX: "Code",
  XLSM: "XLSX",
};

const categoryIcons = new Set([
  "Audio",
  "Code",
  "Documents",
  "Excel",
  "Folder",
  "Image",
  "PDF",
  "Video",
  "Video 2",
]);

const normalFileIconModules = import.meta.glob(
  "../../../../../resources/assets/icons/file/normal/**/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const normalFileIconsByPath = new Map(
  Object.entries(normalFileIconModules).map(([path, url]) => [
    path.split("/normal/")[1] ?? path,
    url,
  ]),
);

const defaultFileIconPath = "Color=Icon + B/W, File Type=Documents.png";

export function getTaskFileIconUrl(task: DownloadTask): string {
  const extension = getTaskFileExtension(task);
  const matchedExtension = extension
    ? (extensionAliases[extension] ?? extension)
    : null;

  if (matchedExtension && fileIconExtensions.has(matchedExtension)) {
    return createAssetUrl(
      `Color=Outline + Color, File Type=${matchedExtension}.png`,
    );
  }

  if (matchedExtension && categoryIcons.has(matchedExtension)) {
    return createAssetUrl(
      "Color=Icon + B",
      `W, File Type=${matchedExtension}.png`,
    );
  }

  return createAssetUrl(defaultFileIconPath);
}

function getTaskFileExtension(task: DownloadTask): string | null {
  const fileName =
    task.files
      .find((file) => file.path)
      ?.path.split(/[\\/]/)
      .at(-1) ??
    task.name ??
    task.source;
  const withoutQuery = fileName.split(/[?#]/)[0] ?? "";
  const match = /\.([a-z0-9]+)$/i.exec(withoutQuery);

  return match?.[1]?.toUpperCase() ?? null;
}

function createAssetUrl(...segments: string[]): string {
  const path = segments.join("/");
  return (
    normalFileIconsByPath.get(path) ??
    normalFileIconsByPath.get(defaultFileIconPath) ??
    ""
  );
}

export function calculateOverallProgress(snapshot: TaskSnapshot): number {
  const total = getTotalBytes(snapshot.tasks);

  if (total <= 0) {
    return 0;
  }

  return (getCompletedBytes(snapshot.tasks) / total) * 100;
}

export function getCompletedBytes(tasks: DownloadTask[]): number {
  return tasks.reduce((total, task) => total + task.completedLength, 0);
}

export function getTotalBytes(tasks: DownloadTask[]): number {
  return tasks.reduce(
    (total, task) => total + (task.totalLength ?? task.completedLength),
    0,
  );
}

export function formatBytes(value: number): string {
  if (value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024)),
  );

  return `${(value / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${
    units[unitIndex]
  }`;
}

export function formatRemaining(seconds: number | null): string {
  if (seconds === null) {
    return "未知";
  }

  if (seconds < 60) {
    return `${seconds} 秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes} 分 ${remainder} 秒`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function isRuntimeConnected(runtime: RuntimeStatus): boolean {
  return runtime.availability === "ready";
}
