import type { DownloadTask } from "@shared/types";
import {
  AlertTriangle,
  FileSymlink,
  FolderOpen,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useDownloads } from "@/hooks/use-downloads";
import { normalizeUserError } from "@/lib/tide-api";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  formatRemaining,
  getTaskFileIconUrl,
} from "./download-utils";
import { Metric, Modal, Sparkline, TaskStateBadge } from "./shared";
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
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  if (!task) {
    return (
      <aside
        aria-label="内容详情"
        className="workspace-surface min-h-0 border-l"
      />
    );
  }

  return (
    <>
      <aside className="workspace-surface flex min-h-0 flex-col overflow-hidden border-l">
        <div className="shrink-0 border-b p-4 min-[1040px]:p-5">
          <div className="flex items-start gap-3">
            <img
              alt=""
              aria-hidden="true"
              className="size-10 shrink-0 object-contain min-[1040px]:size-12"
              draggable={false}
              src={getTaskFileIconUrl(task)}
            />
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-3 text-sm font-semibold min-[1040px]:text-base">
                {task.name}
              </h2>
              <TaskStateBadge state={task.state} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                aria-label="打开文件夹"
                onClick={() => void actions.revealFolder(task.gid)}
                size="icon"
                variant="outline"
              >
                <FolderOpen aria-hidden="true" size={16} />
              </Button>
              <TaskDetailMenu
                actions={actions}
                onRemove={() => setIsRemoveOpen(true)}
                task={task}
              />
            </div>
          </div>
          {activeView === "history" ? (
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void actions.retry(task.gid)} size="sm">
                <RefreshCw aria-hidden="true" size={14} />
                重新下载
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 border-b px-3 min-[1040px]:px-5">
          {(["overview", "files", "peers", "log"] as DetailTab[]).map((tab) => (
            <Button
              className={cn(
                "h-10 rounded-none border-b-2 px-3 text-xs",
                activeTab === tab
                  ? "border-primary text-primary hover:text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              key={tab}
              onClick={() => onTabChange(tab)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {getDetailTabLabel(tab)}
            </Button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 min-[1040px]:p-5">
          <div className="flex flex-col gap-4 min-[1040px]:gap-5">
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
      {isRemoveOpen ? (
        <RemoveTaskDialog
          actions={actions}
          onClose={() => setIsRemoveOpen(false)}
          task={task}
        />
      ) : null}
    </>
  );
}

function TaskDetailMenu({
  actions,
  onRemove,
  task,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  onRemove: () => void;
  task: DownloadTask;
}) {
  const canPause =
    task.state === "active" ||
    task.state === "seeding" ||
    task.state === "queued";
  const canResume = task.state === "paused";

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
          {canPause ? (
            <DropdownMenuItem onClick={() => void actions.pause(task.gid)}>
              <Pause aria-hidden="true" />
              暂停下载
            </DropdownMenuItem>
          ) : canResume ? (
            <DropdownMenuItem onClick={() => void actions.resume(task.gid)}>
              <Play aria-hidden="true" />
              继续下载
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => void actions.retry(task.gid)}>
              <RefreshCw aria-hidden="true" />
              重新下载
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onRemove}>
            <Trash2 aria-hidden="true" />
            删除任务
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RemoveTaskDialog({
  actions,
  onClose,
  task,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  onClose: () => void;
  task: DownloadTask;
}) {
  const [removeFiles, setRemoveFiles] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRemoving(true);
    setError(null);

    try {
      await actions.remove(task.gid, removeFiles);
      onClose();
    } catch (caught) {
      setError(normalizeUserError(caught));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Modal closeDisabled={isRemoving} onClose={onClose} title="删除下载任务">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <p className="text-sm leading-6">确定删除以下任务吗？</p>
          <p className="mt-1 truncate text-sm font-semibold" title={task.name}>
            {task.name}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/40 p-3">
          <div>
            <label className="text-sm font-medium" htmlFor="remove-task-files">
              同时删除已下载文件
            </label>
            <p
              className="mt-1 text-xs leading-5 text-muted-foreground"
              id="remove-task-files-help"
            >
              默认仅从 TideX 中移除任务，磁盘文件会保留。
            </p>
          </div>
          <Switch
            aria-describedby="remove-task-files-help"
            checked={removeFiles}
            disabled={isRemoving}
            id="remove-task-files"
            onClick={() => setRemoveFiles((current) => !current)}
          />
        </div>

        {removeFiles ? (
          <Alert variant="destructive">
            <AlertTriangle
              aria-hidden="true"
              className="absolute left-3 top-3"
              size={16}
            />
            <AlertDescription className="pl-6">
              已下载文件将从磁盘删除，此操作无法撤销。
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            disabled={isRemoving}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            取消
          </Button>
          <Button disabled={isRemoving} type="submit" variant="destructive">
            <Trash2 aria-hidden="true" size={14} />
            {isRemoving
              ? "正在删除…"
              : removeFiles
                ? "删除任务和文件"
                : "删除任务"}
          </Button>
        </div>
      </form>
    </Modal>
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
      <div className="grid grid-cols-3 gap-2 min-[1040px]:gap-3">
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
        <Sparkline label="实时下载速度波形" value={task.downloadSpeed} />
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
        <Card className="shadow-none" key={file.index}>
          <CardContent className="p-3">
            <p className="truncate text-sm font-medium">{file.path}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatBytes(file.completedLength)} / {formatBytes(file.length)}
            </p>
          </CardContent>
        </Card>
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
  const lines =
    task.logLines.length > 0
      ? task.logLines
      : task.errorMessage
        ? [task.errorMessage]
        : [];

  if (lines.length === 0) {
    return (
      <Card className="bg-muted/40 shadow-none">
        <CardContent className="p-3 text-xs text-muted-foreground">
          该任务暂无日志。
        </CardContent>
      </Card>
    );
  }

  return <VirtualLogList lines={lines} taskGid={task.gid} />;
}

const logRowHeight = 28;
const logOverscan = 8;

function VirtualLogList({
  lines,
  taskGid,
}: {
  lines: string[];
  taskGid: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(260);
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / logRowHeight) - logOverscan,
  );
  const visibleCount = Math.ceil(viewportHeight / logRowHeight);
  const endIndex = Math.min(
    lines.length,
    startIndex + visibleCount + logOverscan * 2,
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setViewportHeight(entry.contentRect.height);
    });
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    shouldStickToBottomRef.current = true;
    setScrollTop(0);
  }, [taskGid]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || !shouldStickToBottomRef.current) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [lines.length, taskGid]);

  return (
    <Card className="h-[clamp(12rem,calc(100vh-260px),28rem)] overflow-hidden bg-muted/40 shadow-none">
      <CardContent
        aria-label={`任务日志，共 ${lines.length} 条`}
        className="h-full overflow-auto p-0 font-mono text-xs"
        onScroll={(event) => {
          const viewport = event.currentTarget;
          setScrollTop(viewport.scrollTop);
          shouldStickToBottomRef.current =
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
            logRowHeight * 2;
        }}
        ref={viewportRef}
        role="log"
      >
        <div
          className="relative min-w-max"
          style={{ height: lines.length * logRowHeight }}
        >
          {lines.slice(startIndex, endIndex).map((line, offset) => {
            const index = startIndex + offset;

            return (
              <div
                className="absolute left-0 flex w-full items-center border-b border-border/50 px-3 text-muted-foreground"
                key={`${index}-${line}`}
                style={{
                  height: logRowHeight,
                  transform: `translateY(${index * logRowHeight}px)`,
                }}
                title={line}
              >
                <span className="mr-3 w-10 shrink-0 select-none text-right text-[10px] opacity-60">
                  {index + 1}
                </span>
                <span className="whitespace-pre">{line}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
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
