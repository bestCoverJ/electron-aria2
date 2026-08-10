import type { AppSettings, DownloadTask } from "@shared/types";
import type { MouseEvent } from "react";
import {
  MoreHorizontal,
  FolderOpen,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDownloads } from "@/hooks/use-downloads";
import { cn } from "@/lib/utils";
import { AboutWorkspace } from "./AboutWorkspace";
import {
  formatBytes,
  formatDate,
  getEmptyMessage,
  getEmptyTitle,
  getStatusFilterLabel,
  getTaskFileIconUrl,
  getViewIcon,
  getViewTitle,
} from "./download-utils";
import type { DownloadStatusFilter } from "./download-utils";
import { EmptyState, TaskStateBadge } from "./shared";
import { SettingsWorkspace } from "./SettingsWorkspace";
import type { MainView } from "./types";

export function WorkspacePanel({
  actions,
  activeView,
  error,
  isLoading,
  onAdd,
  onClearTaskSelection,
  onSelectTask,
  query,
  selectedGid,
  setQuery,
  setStatusFilter,
  settings,
  statusFilter,
  tasks,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  activeView: MainView;
  error: string | null;
  isLoading: boolean;
  onAdd: () => void;
  onClearTaskSelection: () => void;
  onSelectTask: (gid: string) => void;
  query: string;
  selectedGid: string | null;
  setQuery: (query: string) => void;
  setStatusFilter: (filter: DownloadStatusFilter) => void;
  settings: AppSettings | null;
  statusFilter: DownloadStatusFilter;
  tasks: DownloadTask[];
}) {
  if (activeView === "about") {
    return (
      <section className="workspace-surface flex min-h-0 flex-col">
        <WorkspaceHeader
          count={0}
          actions={actions}
          onAdd={onAdd}
          query={query}
          setQuery={setQuery}
          setStatusFilter={setStatusFilter}
          statusFilter={statusFilter}
          title="关于 Tide X"
          variant="about"
          compact={false}
        />
        <AboutWorkspace />
      </section>
    );
  }

  if (activeView === "settings") {
    return (
      <section className="workspace-surface flex min-h-0 flex-col">
        <WorkspaceHeader
          count={0}
          actions={actions}
          onAdd={onAdd}
          query={query}
          setQuery={setQuery}
          setStatusFilter={setStatusFilter}
          statusFilter={statusFilter}
          title="设置"
          variant="settings"
          compact={false}
        />
        {settings ? (
          <SettingsWorkspace actions={actions} settings={settings} />
        ) : (
          <EmptyState
            icon={Settings}
            isLoading={isLoading}
            message="设置尚未加载。"
            title="设置不可用"
          />
        )}
      </section>
    );
  }

  return (
    <section className="workspace-surface flex min-h-0 flex-col">
      <WorkspaceHeader
        count={tasks.length}
        actions={actions}
        onAdd={onAdd}
        query={query}
        setQuery={setQuery}
        setStatusFilter={setStatusFilter}
        statusFilter={statusFilter}
        title={getViewTitle(activeView)}
        variant={activeView}
        compact={Boolean(selectedGid)}
      />
      {error ? (
        <Alert
          className="mx-4 mt-3 flex w-auto items-center gap-3"
          variant="destructive"
        >
          <AlertDescription className="min-w-0 flex-1">
            {error}
          </AlertDescription>
          <Button
            aria-label="重试"
            onClick={() => void actions.refresh()}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw aria-hidden="true" size={14} />
            重试
          </Button>
          <Button
            aria-label="关闭错误提示"
            onClick={actions.clearError}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" size={15} />
          </Button>
        </Alert>
      ) : null}
      {tasks.length === 0 ? (
        <EmptyState
          actionLabel={
            query.trim() || statusFilter !== "all" ? "清除筛选" : undefined
          }
          icon={getViewIcon(activeView)}
          isLoading={isLoading}
          message={
            query.trim() || statusFilter !== "all"
              ? "请尝试更换关键词或清除当前筛选条件。"
              : getEmptyMessage(activeView)
          }
          onAction={
            query.trim() || statusFilter !== "all"
              ? () => {
                  setQuery("");
                  setStatusFilter("all");
                }
              : activeView === "downloads"
                ? onAdd
                : undefined
          }
          title={
            query.trim() || statusFilter !== "all"
              ? "没有匹配的任务"
              : getEmptyTitle(activeView)
          }
        />
      ) : (
        <div
          className="min-h-0 flex-1 overflow-auto px-3 py-2"
          onClick={(event) => {
            if (!isTaskRowClick(event)) {
              onClearTaskSelection();
            }
          }}
        >
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <TaskListItem
                actions={actions}
                key={task.gid}
                onSelect={onSelectTask}
                selected={selectedGid === task.gid}
                task={task}
                view={activeView}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function isTaskRowClick(event: MouseEvent<HTMLElement>): boolean {
  return (
    event.target instanceof Element &&
    Boolean(event.target.closest(".task-row"))
  );
}

function WorkspaceHeader({
  actions,
  count,
  onAdd,
  query,
  setQuery,
  setStatusFilter,
  statusFilter,
  title,
  variant,
  compact,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  compact: boolean;
  count: number;
  onAdd: () => void;
  query: string;
  setQuery: (query: string) => void;
  setStatusFilter: (filter: DownloadStatusFilter) => void;
  statusFilter: DownloadStatusFilter;
  title: string;
  variant: MainView;
}) {
  return (
    <header className="flex h-12 items-center gap-2 border-b px-3 min-[1040px]:gap-3 min-[1040px]:px-4">
      <h1 className="min-w-0 truncate text-sm font-semibold">{title}</h1>
      {variant !== "settings" && variant !== "about" && !compact ? (
        <Badge className="shrink-0" variant="secondary">
          {count}
        </Badge>
      ) : null}
      <div className="min-w-0 flex-1" />
      {variant === "downloads" ? (
        <Button
          aria-label={compact ? "新建下载任务" : undefined}
          onClick={onAdd}
          size="sm"
          title={compact ? "新建" : undefined}
        >
          <Plus aria-hidden="true" size={14} />
          {compact ? null : "新建"}
        </Button>
      ) : null}
      {variant !== "settings" && variant !== "about" && !compact ? (
        <>
          {variant === "downloads" ? (
            <Select
              onValueChange={(value) =>
                setStatusFilter(value as DownloadStatusFilter)
              }
              value={statusFilter}
            >
              <SelectTrigger aria-label="筛选下载状态" className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  {statusFilters.map((filter) => (
                    <SelectItem key={filter} value={filter}>
                      {getStatusFilterLabel(filter)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}
          <label className="relative w-36">
            <span className="sr-only">搜索</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={15}
            />
            <Input
              className="h-8 pl-8"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索"
              value={query}
            />
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="更多操作" size="icon" variant="ghost">
                <MoreHorizontal aria-hidden="true" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                {variant === "downloads" ? (
                  <>
                    <DropdownMenuItem
                      disabled={count === 0}
                      onClick={() => {
                        if (
                          window.confirm(
                            "确定删除全部下载任务吗？已下载的文件不会被删除。",
                          )
                        ) {
                          void actions.clearAll();
                        }
                      }}
                    >
                      删除全部下载任务
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void actions.clearCompleted()}
                    >
                      删除已完成的任务
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void actions.retryFailed()}
                    >
                      重试失败的下载任务
                    </DropdownMenuItem>
                  </>
                ) : variant === "history" ? (
                  <DropdownMenuItem
                    disabled={count === 0}
                    onClick={() => void actions.clearCompleted()}
                  >
                    清空历史记录
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>暂无批量操作</DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}
    </header>
  );
}

const statusFilters: DownloadStatusFilter[] = [
  "all",
  "not-started",
  "active",
  "paused",
  "completed",
  "failed",
  "stopped",
];

function TaskListItem({
  actions,
  onSelect,
  selected,
  task,
  view,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  onSelect: (gid: string) => void;
  selected: boolean;
  task: DownloadTask;
  view: MainView;
}) {
  return (
    <article
      className={cn(
        "task-row flex items-center gap-2 rounded-md border px-2 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring",
        selected
          ? "border-blue-200 bg-blue-50/75 dark:border-primary/50 dark:bg-primary/15"
          : "border-transparent bg-white hover:border-blue-100 hover:bg-blue-50/40 dark:bg-card dark:hover:border-primary/30 dark:hover:bg-primary/10",
      )}
    >
      <button
        aria-pressed={selected}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm p-1 text-left focus-visible:outline-none"
        onClick={() => onSelect(task.gid)}
        type="button"
      >
        <img
          alt=""
          aria-hidden="true"
          className="size-11 shrink-0 object-contain"
          draggable={false}
          src={getTaskFileIconUrl(task)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{task.name}</h2>
            <TaskStateBadge state={task.state} />
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatBytes(task.completedLength)}</span>
            {task.totalLength ? (
              <span>/ {formatBytes(task.totalLength)}</span>
            ) : null}
            {view === "history" ? (
              <span>{formatDate(task.updatedAt)}</span>
            ) : null}
            {view === "downloads" || view === "trash" ? (
              <span
                className="ml-auto shrink-0 tabular-nums"
                title={`下载速度：${formatBytes(task.downloadSpeed)}/s`}
              >
                ↓ {formatBytes(task.downloadSpeed)}/s
              </span>
            ) : null}
          </div>
          {view === "downloads" || view === "trash" ? (
            <div className="mt-2 flex items-center gap-3">
              <Progress
                className="h-1.5"
                label={`${task.name} 下载进度`}
                value={task.progress}
              />
              <span className="w-9 text-right text-xs text-muted-foreground">
                {Math.round(task.progress)}%
              </span>
            </div>
          ) : null}
        </div>
      </button>
      {view === "history" ? (
        <Badge variant="success">已完成</Badge>
      ) : (
        <TaskQuickAction actions={actions} task={task} />
      )}
    </article>
  );
}

function TaskQuickAction({
  actions,
  task,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  task: DownloadTask;
}) {
  if (task.state === "completed") {
    return (
      <Button
        aria-label="打开文件夹"
        onClick={(event) => {
          event.stopPropagation();
          void actions.revealFolder(task.gid);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        size="icon"
        type="button"
        variant="outline"
      >
        <FolderOpen aria-hidden="true" size={15} />
      </Button>
    );
  }

  if (
    task.state === "active" ||
    task.state === "seeding" ||
    task.state === "queued"
  ) {
    return (
      <Button
        aria-label="暂停下载"
        onClick={(event) => {
          event.stopPropagation();
          void actions.pause(task.gid);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        size="icon"
        type="button"
        variant="outline"
      >
        <Pause aria-hidden="true" size={15} />
      </Button>
    );
  }

  if (task.state === "failed" || task.state === "removed") {
    return (
      <Button
        aria-label="重试下载"
        onClick={(event) => {
          event.stopPropagation();
          void actions.retry(task.gid);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        size="icon"
        type="button"
        variant="outline"
      >
        <RotateCcw aria-hidden="true" size={15} />
      </Button>
    );
  }

  return (
    <Button
      aria-label="继续下载"
      onClick={(event) => {
        event.stopPropagation();
        void actions.resume(task.gid);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      size="icon"
      type="button"
      variant="outline"
    >
      <Play aria-hidden="true" size={15} />
    </Button>
  );
}
