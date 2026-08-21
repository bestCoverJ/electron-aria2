import type { DownloadTask, RuntimeStatus, TaskSnapshot } from "@shared/types";
import { Download, History, Info, Settings, Trash2 } from "lucide-react";
import type { MainView } from "./types";

export type DownloadStatusFilter =
  | "all"
  | "not-started"
  | "active"
  | "paused"
  | "completed"
  | "failed"
  | "stopped";

export interface TaskFilters {
  query: string;
  status: DownloadStatusFilter;
  fileType: string;
  dateFrom: string;
  dateTo: string;
}

export const emptyTaskFilters: TaskFilters = {
  query: "",
  status: "all",
  fileType: "all",
  dateFrom: "",
  dateTo: "",
};

export function getVisibleTasks(
  tasks: DownloadTask[],
  view: MainView,
  filters: TaskFilters,
): DownloadTask[] {
  const normalizedQuery = filters.query.trim().toLowerCase();
  let scoped = tasks.filter((task) => {
    if (view === "history") {
      return task.state === "completed";
    }

    if (view === "trash") {
      return task.state === "removed";
    }

    if (view === "downloads") {
      return task.state !== "completed" && task.state !== "removed";
    }

    return false;
  });

  if (filters.status !== "all") {
    scoped = scoped.filter((task) => matchesStatusFilter(task, filters.status));
  }

  if (filters.fileType !== "all") {
    scoped = scoped.filter((task) =>
      task.files.some((file) => file.type === filters.fileType),
    );
  }

  scoped = scoped.filter((task) => matchesDateRange(task, filters));

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

function matchesDateRange(task: DownloadTask, filters: TaskFilters): boolean {
  const timestamp = new Date(task.updatedAt).getTime();
  const from = filters.dateFrom
    ? new Date(`${filters.dateFrom}T00:00:00`).getTime()
    : Number.NEGATIVE_INFINITY;
  const to = filters.dateTo
    ? new Date(`${filters.dateTo}T23:59:59.999`).getTime()
    : Number.POSITIVE_INFINITY;

  return timestamp >= from && timestamp <= to;
}

export function hasActiveTaskFilters(filters: TaskFilters): boolean {
  return (
    Boolean(filters.query.trim()) ||
    filters.status !== "all" ||
    filters.fileType !== "all" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo)
  );
}

export function getTaskFileTypes(tasks: DownloadTask[]): string[] {
  return Array.from(
    new Set(tasks.flatMap((task) => task.files.map((file) => file.type))),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function groupTasksByStatus(
  tasks: DownloadTask[],
): Array<{ state: DownloadTask["state"]; tasks: DownloadTask[] }> {
  const order: DownloadTask["state"][] = [
    "active",
    "queued",
    "paused",
    "seeding",
    "failed",
  ];

  return order
    .map((state) => ({
      state,
      tasks: tasks.filter((task) => task.state === state),
    }))
    .filter((group) => group.tasks.length > 0);
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
    about: "关于 TideX",
  };

  return labels[view];
}

export function getViewIcon(view: MainView): typeof Download {
  const icons: Record<MainView, typeof Download> = {
    downloads: Download,
    history: History,
    trash: Trash2,
    settings: Settings,
    about: Info,
  };

  return icons[view];
}

export function getEmptyTitle(view: MainView): string {
  const titles: Record<MainView, string> = {
    downloads: "暂无下载任务",
    history: "暂无历史记录",
    trash: "垃圾箱为空",
    settings: "设置不可用",
    about: "关于信息不可用",
  };

  return titles[view];
}

export function getEmptyMessage(view: MainView): string {
  const messages: Record<MainView, string> = {
    downloads: "添加直链、Magnet、torrent、Metalink 或经典下载器链接开始下载。",
    history: "完成的下载任务会显示在这里。",
    trash: "删除的任务会显示在这里。",
    settings: "设置仍在加载。",
    about: "产品与开源组件信息仍在加载。",
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
  const activeTasks = getActiveDownloadTasks(snapshot.tasks);
  const total = getTotalBytes(activeTasks);

  if (total <= 0) {
    return 0;
  }

  return (getCompletedBytes(activeTasks) / total) * 100;
}

export function getActiveDownloadTasks(tasks: DownloadTask[]): DownloadTask[] {
  return tasks.filter((task) => task.state === "active");
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
