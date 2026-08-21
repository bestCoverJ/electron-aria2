import type { AppSettings, DownloadTask } from "@shared/types";
import { useState, type MouseEvent } from "react";
import {
  MoreHorizontal,
  ListFilter,
  FolderOpen,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Trash2,
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
  getTaskFileTypes,
  groupTasksByStatus,
  hasActiveTaskFilters,
  emptyTaskFilters,
  getStatusFilterLabel,
  getTaskFileIconUrl,
  getViewIcon,
  getViewTitle,
} from "./download-utils";
import type { DownloadStatusFilter, TaskFilters } from "./download-utils";
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
  filters,
  selectedGid,
  onFiltersChange,
  settings,
  tasks,
  unfilteredTasks,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  activeView: MainView;
  error: string | null;
  isLoading: boolean;
  onAdd: () => void;
  onClearTaskSelection: () => void;
  onSelectTask: (gid: string) => void;
  filters: TaskFilters;
  selectedGid: string | null;
  onFiltersChange: (filters: TaskFilters) => void;
  settings: AppSettings | null;
  tasks: DownloadTask[];
  unfilteredTasks: DownloadTask[];
}) {
  if (activeView === "about") {
    return (
      <section className="workspace-surface flex min-h-0 flex-col">
        <WorkspaceHeader
          count={0}
          actions={actions}
          onAdd={onAdd}
          filters={filters}
          onFiltersChange={onFiltersChange}
          sourceTasks={unfilteredTasks}
          title="关于 TideX"
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
          filters={filters}
          onFiltersChange={onFiltersChange}
          sourceTasks={unfilteredTasks}
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
        filters={filters}
        onFiltersChange={onFiltersChange}
        sourceTasks={unfilteredTasks}
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
          actionLabel={hasActiveTaskFilters(filters) ? "清除筛选" : undefined}
          icon={getViewIcon(activeView)}
          isLoading={isLoading}
          message={
            hasActiveTaskFilters(filters)
              ? "请尝试更换关键词或清除当前筛选条件。"
              : getEmptyMessage(activeView)
          }
          onAction={
            hasActiveTaskFilters(filters)
              ? () => {
                  onFiltersChange(emptyTaskFilters);
                }
              : activeView === "downloads"
                ? onAdd
                : undefined
          }
          title={
            hasActiveTaskFilters(filters)
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
          <TaskListContent
            actions={actions}
            grouped={activeView === "downloads" && filters.status === "all"}
            onSelect={onSelectTask}
            selectedGid={selectedGid}
            tasks={tasks}
            view={activeView}
          />
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
  filters,
  onFiltersChange,
  sourceTasks,
  title,
  variant,
  compact,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  compact: boolean;
  count: number;
  onAdd: () => void;
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  sourceTasks: DownloadTask[];
  title: string;
  variant: MainView;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fileTypes = getTaskFileTypes(sourceTasks);
  const showFilters = variant !== "settings" && variant !== "about" && !compact;

  return (
    <header className="shrink-0 border-b">
      <div className="flex h-12 items-center gap-2 px-3 min-[1040px]:gap-3 min-[1040px]:px-4">
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
        {showFilters ? (
          <>
            <label className="relative w-36">
              <span className="sr-only">搜索</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={15}
              />
              <Input
                className="h-8 pl-8"
                onChange={(event) =>
                  onFiltersChange({ ...filters, query: event.target.value })
                }
                placeholder="搜索"
                value={filters.query}
              />
            </label>
            <Button
              aria-expanded={advancedOpen}
              aria-label="高级筛选"
              onClick={() => setAdvancedOpen((current) => !current)}
              size="icon"
              variant={
                hasActiveTaskFilters({ ...filters, query: "" })
                  ? "secondary"
                  : "outline"
              }
            >
              <ListFilter aria-hidden="true" size={16} />
            </Button>
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
      </div>
      {showFilters && advancedOpen ? (
        <AdvancedFilters
          fileTypes={fileTypes}
          filters={filters}
          onChange={onFiltersChange}
          variant={variant}
        />
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

function AdvancedFilters({
  fileTypes,
  filters,
  onChange,
  variant,
}: {
  fileTypes: string[];
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  variant: MainView;
}) {
  const availableStatuses = statusFilters.filter((status) => {
    if (variant === "history")
      return status === "all" || status === "completed";
    if (variant === "trash") return status === "all" || status === "stopped";
    return status !== "completed" && status !== "stopped";
  });

  return (
    <div className="grid grid-cols-2 gap-2 border-t bg-muted/30 px-3 py-2 min-[1040px]:grid-cols-4 min-[1040px]:px-4">
      <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
        状态
        <Select
          onValueChange={(value) =>
            onChange({ ...filters, status: value as DownloadStatusFilter })
          }
          value={filters.status}
        >
          <SelectTrigger className="h-8" aria-label="任务状态">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusFilterLabel(status)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
        文件类型
        <Select
          onValueChange={(value) => onChange({ ...filters, fileType: value })}
          value={filters.fileType}
        >
          <SelectTrigger className="h-8" aria-label="文件类型">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {fileTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
        开始日期
        <Input
          className="h-8"
          max={filters.dateTo || undefined}
          onChange={(event) =>
            onChange({ ...filters, dateFrom: event.target.value })
          }
          type="date"
          value={filters.dateFrom}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
        结束日期
        <Input
          className="h-8"
          min={filters.dateFrom || undefined}
          onChange={(event) =>
            onChange({ ...filters, dateTo: event.target.value })
          }
          type="date"
          value={filters.dateTo}
        />
      </label>
      {hasActiveTaskFilters(filters) ? (
        <Button
          className="col-span-2 justify-self-start min-[1040px]:col-span-4"
          onClick={() => onChange(emptyTaskFilters)}
          size="sm"
          variant="ghost"
        >
          <X aria-hidden="true" size={14} /> 清除筛选
        </Button>
      ) : null}
    </div>
  );
}

function TaskListContent({
  actions,
  grouped,
  onSelect,
  selectedGid,
  tasks,
  view,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  grouped: boolean;
  onSelect: (gid: string) => void;
  selectedGid: string | null;
  tasks: DownloadTask[];
  view: MainView;
}) {
  const groups = grouped ? groupTasksByStatus(tasks) : [];
  if (grouped) {
    return (
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <section
            key={group.state}
            aria-label={getStatusFilterLabel(stateToFilter(group.state))}
          >
            <h2 className="mb-1.5 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
              {getStatusFilterLabel(stateToFilter(group.state))}
              <Badge variant="secondary">{group.tasks.length}</Badge>
            </h2>
            <div className="flex flex-col gap-2">
              {group.tasks.map((task) => (
                <TaskListItem
                  actions={actions}
                  key={task.gid}
                  onSelect={onSelect}
                  selected={selectedGid === task.gid}
                  task={task}
                  view={view}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskListItem
          actions={actions}
          key={task.gid}
          onSelect={onSelect}
          selected={selectedGid === task.gid}
          task={task}
          view={view}
        />
      ))}
    </div>
  );
}

function stateToFilter(state: DownloadTask["state"]): DownloadStatusFilter {
  if (state === "queued") return "not-started";
  if (state === "active" || state === "seeding") return "active";
  if (state === "failed") return "failed";
  if (state === "removed") return "stopped";
  return state;
}

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
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">
              {formatBytes(task.completedLength)}
            </span>
            {task.totalLength ? (
              <span className="whitespace-nowrap">
                / {formatBytes(task.totalLength)}
              </span>
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
      <div className="flex shrink-0 items-center gap-2">
        <TaskStateBadge state={task.state} />
        {view === "history" ? (
          <Button
            aria-label={`删除历史记录 ${task.name}`}
            onClick={(event) => {
              event.stopPropagation();
              if (
                window.confirm("确定删除这条历史记录吗？已下载文件会保留。")
              ) {
                void actions.deleteHistoryRecord(task.gid);
              }
            }}
            size="icon"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" size={15} />
          </Button>
        ) : (
          <TaskQuickAction actions={actions} task={task} />
        )}
      </div>
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
