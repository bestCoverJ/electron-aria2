import type { DownloadTask } from "@shared/types";
import {
  FileSymlink,
  FolderOpen,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useDownloads } from "@/hooks/use-downloads";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  formatRemaining,
  getTaskFileIconUrl,
} from "./download-utils";
import { Metric, Sparkline, TaskStateBadge } from "./shared";
import type { DetailTab, MainView } from "./types";

export function DetailsPanel({
  actions,
  activeTab,
  activeView,
  onTabChange,
  task,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  activeTab: DetailTab;
  activeView: MainView;
  onTabChange: (tab: DetailTab) => void;
  task: DownloadTask | null;
}) {
  if (!task) {
    return (
      <aside
        aria-label="内容详情"
        className="min-h-0 border-l bg-white max-[860px]:hidden"
      />
    );
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-l bg-white max-[860px]:hidden">
      <div className="shrink-0 border-b p-5">
        <div className="flex items-start gap-3">
          <img
            alt=""
            aria-hidden="true"
            className="size-12 shrink-0 object-contain"
            draggable={false}
            src={getTaskFileIconUrl(task)}
          />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-3 text-base font-semibold">
              {task.name}
            </h2>
            <TaskStateBadge state={task.state} />
          </div>
          <TaskDetailMenu actions={actions} task={task} />
        </div>
        <div className="mt-4 flex gap-2">
          {activeView === "history" ? (
            <Button onClick={() => void actions.retry(task.gid)} size="sm">
              <RefreshCw aria-hidden="true" size={14} />
              重新下载
            </Button>
          ) : null}
          <Button
            onClick={() => void actions.revealFolder(task.gid)}
            size="sm"
            variant="outline"
          >
            <FolderOpen aria-hidden="true" size={14} />
            打开文件夹
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 border-b px-5">
        {(["overview", "files", "peers", "log"] as DetailTab[]).map((tab) => (
          <button
            className={cn(
              "h-10 border-b-2 px-3 text-xs font-medium transition-colors",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            key={tab}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {getDetailTabLabel(tab)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="flex flex-col gap-5">
          {activeTab === "overview" ? (
            <OverviewDetails task={task} />
          ) : activeTab === "files" ? (
            <FilesDetails task={task} />
          ) : activeTab === "peers" ? (
            <PeersDetails task={task} />
          ) : (
            <LogDetails task={task} />
          )}
        </div>
      </div>
    </aside>
  );
}

function TaskDetailMenu({
  actions,
  task,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  task: DownloadTask;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="更多任务操作" size="icon" variant="outline">
          <MoreHorizontal aria-hidden="true" size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void actions.revealFile(task.gid)}>
            <FileSymlink aria-hidden="true" />
            打开文件
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void actions.revealFolder(task.gid)}>
            <FolderOpen aria-hidden="true" />
            打开文件夹
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void actions.retry(task.gid)}>
            <RefreshCw aria-hidden="true" />
            重新下载
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void actions.remove(task.gid)}>
            <Trash2 aria-hidden="true" />
            删除任务
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OverviewDetails({ task }: { task: DownloadTask }) {
  return (
    <>
      <DetailRow label="任务来源" value={task.source} />
      <DetailRow
        label="保存路径"
        value={task.files[0]?.path || task.directory || "-"}
      />
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">进度</span>
          <span>{Math.round(task.progress)}%</span>
        </div>
        <Progress label="任务下载进度" value={task.progress} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="已下载" value={formatBytes(task.completedLength)} />
        <Metric
          label="总大小"
          value={task.totalLength ? formatBytes(task.totalLength) : "未知"}
        />
        <Metric
          label="剩余时间"
          value={formatRemaining(task.remainingSeconds)}
        />
        <Metric label="速度" value={`${formatBytes(task.downloadSpeed)}/s`} />
        <Metric label="连接数" value={String(task.connections)} />
        <Metric label="节点" value={task.state === "seeding" ? "活跃" : "-"} />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">速度</span>
          <span>{formatBytes(task.downloadSpeed)}/s</span>
        </div>
        <Sparkline />
      </div>
    </>
  );
}

function FilesDetails({ task }: { task: DownloadTask }) {
  if (task.files.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无文件信息。</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {task.files.map((file) => (
        <div className="rounded-md border p-3" key={file.index}>
          <p className="truncate text-sm font-medium">{file.path}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatBytes(file.completedLength)} / {formatBytes(file.length)}
          </p>
        </div>
      ))}
    </div>
  );
}

function PeersDetails({ task }: { task: DownloadTask }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <DetailRow label="连接数" value={String(task.connections)} />
      <DetailRow
        label="上传速度"
        value={`${formatBytes(task.uploadSpeed)}/s`}
      />
      <p className="text-muted-foreground">
        节点信息取决于 aria2 的 torrent 元数据，获取后会在这里显示。
      </p>
    </div>
  );
}

function LogDetails({ task }: { task: DownloadTask }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs">
      {task.errorMessage ?? "该任务暂无日志。"}
    </div>
  );
}

function getDetailTabLabel(tab: DetailTab): string {
  const labels: Record<DetailTab, string> = {
    overview: "概览",
    files: "文件",
    peers: "节点",
    log: "日志",
  };

  return labels[tab];
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b pb-3 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="break-all text-sm font-medium">{value}</span>
    </div>
  );
}
