import type { DownloadTask, RuntimeStatus, TaskSnapshot } from "@shared/types";
import { Download, History, Settings, Trash2 } from "lucide-react";
import type { MainView } from "./types";

export function getVisibleTasks(
  tasks: DownloadTask[],
  view: MainView,
  query: string,
): DownloadTask[] {
  const normalizedQuery = query.trim().toLowerCase();
  const scoped = tasks.filter((task) => {
    if (view === "history") {
      return task.state === "completed";
    }

    if (view === "trash") {
      return task.state === "removed" || task.state === "failed";
    }

    if (view === "downloads") {
      return task.state !== "completed" && task.state !== "removed";
    }

    return false;
  });

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
    trash: "删除或失败的任务会显示在这里。",
    settings: "设置仍在加载。",
  };

  return messages[view];
}

export function getTaskBrand(name: string): {
  className: string;
  label: string;
} {
  const normalized = name.toLowerCase();

  if (normalized.includes("ubuntu")) {
    return { className: "bg-orange-600", label: "U" };
  }

  if (normalized.includes("fedora")) {
    return { className: "bg-blue-600", label: "F" };
  }

  if (normalized.includes("arch")) {
    return { className: "bg-sky-500", label: "A" };
  }

  if (normalized.includes("windows")) {
    return { className: "bg-cyan-600", label: "W" };
  }

  if (normalized.includes("manjaro")) {
    return { className: "bg-emerald-600", label: "M" };
  }

  return { className: "bg-primary", label: name.slice(0, 1).toUpperCase() };
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
