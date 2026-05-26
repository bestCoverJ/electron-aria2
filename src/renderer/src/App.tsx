import type {
  AppSettings,
  DownloadTask,
  DownloadTaskState,
  RuntimeStatus,
  TaskSnapshot,
} from "@shared/types";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileDown,
  FolderOpen,
  Gauge,
  HardDriveDownload,
  ListFilter,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDownloads } from "@/hooks/use-downloads";
import { cn } from "@/lib/utils";

type TaskFilter = "all" | "active" | "queued" | "completed" | "failed";

const filterItems: Array<{
  id: TaskFilter;
  label: string;
  icon: typeof Download;
}> = [
  { id: "all", label: "全部任务", icon: ListFilter },
  { id: "active", label: "下载中", icon: Download },
  { id: "queued", label: "等待中", icon: Clock3 },
  { id: "completed", label: "已完成", icon: CheckCircle2 },
  { id: "failed", label: "失败", icon: AlertCircle },
];

export function App(): ReactElement {
  const { actions, error, isLoading, settings, snapshot } = useDownloads();
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedGid, setSelectedGid] = useState<string | null>(null);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return snapshot.tasks.filter((task) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "active"
          ? task.state === "active" || task.state === "seeding"
          : task.state === activeFilter);
      const matchesQuery =
        !normalizedQuery ||
        task.name.toLowerCase().includes(normalizedQuery) ||
        task.files.some((file) =>
          file.path.toLowerCase().includes(normalizedQuery),
        );

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query, snapshot.tasks]);

  const selectedTask =
    snapshot.tasks.find((task) => task.gid === selectedGid) ??
    filteredTasks.at(0) ??
    null;
  const overallProgress = calculateOverallProgress(snapshot);

  if (isCompactMode) {
    return (
      <CompactMode
        onExpand={() => setIsCompactMode(false)}
        progress={overallProgress}
        snapshot={snapshot}
      />
    );
  }

  return (
    <main className="app-surface min-h-screen overflow-hidden text-foreground">
      <div
        className={cn(
          "grid min-h-screen transition-[grid-template-columns] duration-300",
          isMenuCollapsed ? "grid-cols-[76px_1fr]" : "grid-cols-[264px_1fr]",
        )}
      >
        <Sidebar
          activeFilter={activeFilter}
          collapsed={isMenuCollapsed}
          filterCounts={getFilterCounts(snapshot.tasks)}
          onCollapseChange={setIsMenuCollapsed}
          onCompact={() => setIsCompactMode(true)}
          onFilterChange={setActiveFilter}
          runtime={snapshot.runtime}
        />

        <section className="flex min-w-0 flex-col">
          <Header
            error={error}
            isLoading={isLoading}
            onAdd={() => setIsAddOpen(true)}
            onSettings={() => setIsSettingsOpen(true)}
            query={query}
            runtime={snapshot.runtime}
            setQuery={setQuery}
            snapshot={snapshot}
          />

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-0 max-[1040px]:grid-cols-1">
            <TaskList
              actions={actions}
              isLoading={isLoading}
              onAdd={() => setIsAddOpen(true)}
              onSelect={setSelectedGid}
              selectedGid={selectedTask?.gid ?? null}
              tasks={filteredTasks}
            />
            <TaskDetails
              actions={actions}
              runtime={snapshot.runtime}
              task={selectedTask}
            />
          </div>
        </section>
      </div>

      {isAddOpen ? (
        <AddDownloadDialog
          defaultDirectory={settings?.downloadDirectory ?? ""}
          onClose={() => setIsAddOpen(false)}
          onSubmit={async (source, directory) => {
            await actions.add({ source, directory: directory || undefined });
            setIsAddOpen(false);
          }}
        />
      ) : null}

      {isSettingsOpen && settings ? (
        <SettingsDialog
          onClose={() => setIsSettingsOpen(false)}
          onSubmit={actions.updateSettings}
          settings={settings}
        />
      ) : null}
    </main>
  );
}

function Sidebar({
  activeFilter,
  collapsed,
  filterCounts,
  onCollapseChange,
  onCompact,
  onFilterChange,
  runtime,
}: {
  activeFilter: TaskFilter;
  collapsed: boolean;
  filterCounts: Record<TaskFilter, number>;
  onCollapseChange: (collapsed: boolean) => void;
  onCompact: () => void;
  onFilterChange: (filter: TaskFilter) => void;
  runtime: RuntimeStatus;
}) {
  return (
    <aside className="glass-panel flex min-h-screen flex-col border-r px-3 py-4">
      <div
        className={cn(
          "flex items-center gap-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HardDriveDownload aria-hidden="true" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">Tide X</p>
              <p className="truncate text-xs text-muted-foreground">
                跨平台下载管理
              </p>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <Button
            aria-label="收起功能菜单"
            onClick={() => onCollapseChange(true)}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {collapsed ? (
        <Button
          aria-label="展开功能菜单"
          className="mt-4"
          onClick={() => onCollapseChange(false)}
          size="icon"
          variant="ghost"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      ) : null}

      <nav className="mt-6 flex flex-col gap-1" aria-label="下载任务筛选">
        {filterItems.map((item) => {
          const Icon = item.icon;
          const selected = activeFilter === item.id;

          return (
            <button
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-0",
              )}
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              title={collapsed ? item.label : undefined}
              type="button"
            >
              <Icon aria-hidden="true" />
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-left">
                    {item.label}
                  </span>
                  <span className="font-mono text-xs">
                    {filterCounts[item.id]}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {!collapsed ? (
          <div className="rounded-lg border bg-card/85 p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                Runtime
              </span>
              <RuntimeBadge runtime={runtime} />
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {runtime.message ?? `RPC 端口 ${runtime.rpcPort ?? "-"}`}
            </p>
          </div>
        ) : null}
        <Button
          aria-label="切换到简洁模式"
          onClick={onCompact}
          size={collapsed ? "icon" : "sm"}
          variant="outline"
        >
          <Gauge aria-hidden="true" data-icon="inline-start" />
          {!collapsed ? "简洁模式" : null}
        </Button>
      </div>
    </aside>
  );
}

function Header({
  error,
  isLoading,
  onAdd,
  onSettings,
  query,
  runtime,
  setQuery,
  snapshot,
}: {
  error: string | null;
  isLoading: boolean;
  onAdd: () => void;
  onSettings: () => void;
  query: string;
  runtime: RuntimeStatus;
  setQuery: (query: string) => void;
  snapshot: TaskSnapshot;
}) {
  return (
    <header className="glass-panel border-b px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-normal">下载任务</h1>
            <RuntimeBadge runtime={runtime} />
            {isLoading ? <Badge variant="outline">同步中</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {error ??
              `${snapshot.summary.activeCount} 个活动任务，当前速度 ${formatBytes(
                snapshot.summary.downloadSpeed,
              )}/s`}
          </p>
        </div>

        <div className="flex min-w-[320px] flex-1 items-center justify-end gap-2">
          <label className="relative w-full max-w-sm">
            <span className="sr-only">搜索任务</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="pl-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索任务或文件"
              value={query}
            />
          </label>
          <Button onClick={onSettings} size="sm" variant="outline">
            <Settings aria-hidden="true" data-icon="inline-start" />
            设置
          </Button>
          <Button onClick={onAdd} size="sm">
            <Plus aria-hidden="true" data-icon="inline-start" />
            新建
          </Button>
        </div>
      </div>
    </header>
  );
}

function TaskList({
  actions,
  isLoading,
  onAdd,
  onSelect,
  selectedGid,
  tasks,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  isLoading: boolean;
  onAdd: () => void;
  onSelect: (gid: string) => void;
  selectedGid: string | null;
  tasks: DownloadTask[];
}) {
  return (
    <section className="min-h-0 overflow-auto p-5" aria-label="下载任务列表">
      {tasks.length === 0 ? (
        <EmptyState isLoading={isLoading} onAdd={onAdd} />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskRow
              actions={actions}
              key={task.gid}
              onSelect={onSelect}
              selected={selectedGid === task.gid}
              task={task}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskRow({
  actions,
  onSelect,
  selected,
  task,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  onSelect: (gid: string) => void;
  selected: boolean;
  task: DownloadTask;
}) {
  return (
    <article
      className={cn(
        "task-row cursor-pointer rounded-lg border bg-card/90 p-4 backdrop-blur-xl transition-colors hover:bg-card focus-within:ring-2 focus-within:ring-ring",
        selected && "border-primary/70 bg-card",
      )}
      onClick={() => onSelect(task.gid)}
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FileDown aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{task.name}</h2>
            <TaskStateBadge state={task.state} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Progress
              className="max-w-xl"
              label={`${task.name} 下载进度`}
              value={task.progress}
            />
            <span className="w-12 text-right font-mono text-xs text-muted-foreground">
              {Math.round(task.progress)}%
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {formatBytes(task.completedLength)} /{" "}
              {task.totalLength ? formatBytes(task.totalLength) : "未知"}
            </span>
            <span>{formatBytes(task.downloadSpeed)}/s</span>
            <span>{formatRemaining(task.remainingSeconds)}</span>
          </div>
        </div>
        <TaskActions actions={actions} task={task} />
      </div>
    </article>
  );
}

function TaskActions({
  actions,
  task,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  task: DownloadTask;
}) {
  const canPause = task.state === "active" || task.state === "seeding";
  const canResume = task.state === "paused" || task.state === "queued";

  return (
    <div className="flex shrink-0 items-center gap-1">
      {canPause ? (
        <Button
          aria-label="暂停任务"
          onClick={(event) => {
            event.stopPropagation();
            void actions.pause(task.gid);
          }}
          size="icon"
          variant="ghost"
        >
          <Pause aria-hidden="true" />
        </Button>
      ) : null}
      {canResume ? (
        <Button
          aria-label="继续任务"
          onClick={(event) => {
            event.stopPropagation();
            void actions.resume(task.gid);
          }}
          size="icon"
          variant="ghost"
        >
          <Play aria-hidden="true" />
        </Button>
      ) : null}
      {task.state === "failed" ? (
        <Button
          aria-label="重试任务"
          onClick={(event) => {
            event.stopPropagation();
            void actions.retry(task.gid);
          }}
          size="icon"
          variant="ghost"
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      ) : null}
      <Button
        aria-label="在文件夹中显示"
        onClick={(event) => {
          event.stopPropagation();
          void actions.revealFolder(task.gid);
        }}
        size="icon"
        variant="ghost"
      >
        <FolderOpen aria-hidden="true" />
      </Button>
      <Button
        aria-label="删除任务"
        onClick={(event) => {
          event.stopPropagation();
          void actions.remove(task.gid);
        }}
        size="icon"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}

function TaskDetails({
  actions,
  runtime,
  task,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  runtime: RuntimeStatus;
  task: DownloadTask | null;
}) {
  return (
    <aside className="glass-panel min-h-0 overflow-auto border-l p-5 max-[1040px]:hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">任务详情</h2>
        <RuntimeBadge runtime={runtime} />
      </div>

      {!task ? (
        <p className="mt-6 text-sm text-muted-foreground">
          选择一个任务查看连接、文件和错误信息。
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          <div>
            <p className="break-all text-base font-semibold">{task.name}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {task.gid}
            </p>
          </div>
          <Progress label="选中任务进度" value={task.progress} />
          <div className="grid grid-cols-2 gap-3">
            <Metric label="已下载" value={formatBytes(task.completedLength)} />
            <Metric
              label="总大小"
              value={task.totalLength ? formatBytes(task.totalLength) : "未知"}
            />
            <Metric
              label="下载速度"
              value={`${formatBytes(task.downloadSpeed)}/s`}
            />
            <Metric label="连接数" value={String(task.connections)} />
          </div>
          {task.errorMessage ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {task.errorMessage}
            </div>
          ) : null}
          <Separator />
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => void actions.revealFile(task.gid)}
              variant="outline"
            >
              <ExternalLink aria-hidden="true" data-icon="inline-start" />
              打开文件位置
            </Button>
            <Button
              onClick={() => void actions.remove(task.gid, true)}
              variant="outline"
            >
              <Trash2 aria-hidden="true" data-icon="inline-start" />
              删除任务及文件
            </Button>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground">
              文件
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {task.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无文件信息</p>
              ) : (
                task.files.slice(0, 6).map((file) => (
                  <div className="rounded-md bg-muted/70 p-2" key={file.index}>
                    <p className="truncate text-xs">{file.path}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatBytes(file.completedLength)} /{" "}
                      {formatBytes(file.length)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function AddDownloadDialog({
  defaultDirectory,
  onClose,
  onSubmit,
}: {
  defaultDirectory: string;
  onClose: () => void;
  onSubmit: (source: string, directory: string) => Promise<void>;
}) {
  const [source, setSource] = useState("");
  const [directory, setDirectory] = useState(defaultDirectory);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!source.trim()) {
      setError("请输入 HTTP/HTTPS、Magnet、torrent 或 Metalink。");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(source, directory);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "添加任务失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title="新建下载任务">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">任务来源</span>
          <Textarea
            aria-invalid={Boolean(error)}
            onChange={(event) => setSource(event.target.value)}
            placeholder="https://example.com/file.zip 或 magnet:?xt=..."
            value={source}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">保存目录</span>
          <Input
            onChange={(event) => setDirectory(event.target.value)}
            value={directory}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">
            取消
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <Plus aria-hidden="true" data-icon="inline-start" />
            添加
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SettingsDialog({
  onClose,
  onSubmit,
  settings,
}: {
  onClose: () => void;
  onSubmit: (patch: Partial<AppSettings>) => Promise<void>;
  settings: AppSettings;
}) {
  const [draft, setDraft] = useState(settings);
  const [advancedText, setAdvancedText] = useState(
    JSON.stringify(settings.advancedAria2Options, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const advanced = JSON.parse(advancedText) as Record<string, string>;
      await onSubmit({ ...draft, advancedAria2Options: advanced });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存设置失败。");
    }
  }

  return (
    <Modal onClose={onClose} title="设置">
      <form
        className="flex max-h-[70vh] flex-col gap-4 overflow-auto pr-1"
        onSubmit={handleSubmit}
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">默认保存目录</span>
          <Input
            onChange={(event) =>
              setDraft({ ...draft, downloadDirectory: event.target.value })
            }
            value={draft.downloadDirectory}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="同时下载数"
            min={1}
            onChange={(value) =>
              setDraft({ ...draft, maxConcurrentDownloads: value })
            }
            value={draft.maxConcurrentDownloads}
          />
          <NumberField
            label="单任务连接"
            min={1}
            onChange={(value) =>
              setDraft({ ...draft, connectionsPerTask: value })
            }
            value={draft.connectionsPerTask}
          />
          <OptionalNumberField
            label="下载限速 B/s"
            onChange={(value) =>
              setDraft({ ...draft, globalDownloadLimit: value })
            }
            value={draft.globalDownloadLimit}
          />
          <OptionalNumberField
            label="上传限速 B/s"
            onChange={(value) =>
              setDraft({ ...draft, globalUploadLimit: value })
            }
            value={draft.globalUploadLimit}
          />
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">代理</span>
          <Input
            onChange={(event) =>
              setDraft({ ...draft, proxyUrl: event.target.value || null })
            }
            placeholder="http://127.0.0.1:7890"
            value={draft.proxyUrl ?? ""}
          />
        </label>
        <div className="flex items-center justify-between gap-4 rounded-md border bg-card/80 p-3">
          <div>
            <p className="text-sm font-medium">关闭时询问</p>
            <p className="text-xs text-muted-foreground">
              后续托盘行为会读取这个偏好。
            </p>
          </div>
          <Switch
            checked={draft.shutdownBehavior === "ask"}
            onClick={() =>
              setDraft({
                ...draft,
                shutdownBehavior:
                  draft.shutdownBehavior === "ask" ? "minimize-to-tray" : "ask",
              })
            }
          />
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">高级 aria2 选项 JSON</span>
          <Textarea
            className="font-mono"
            onChange={(event) => setAdvancedText(event.target.value)}
            value={advancedText}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">
            取消
          </Button>
          <Button type="submit">
            <SlidersHorizontal aria-hidden="true" data-icon="inline-start" />
            保存设置
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactElement;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      aria-labelledby="modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <section className="w-full max-w-xl rounded-lg border bg-popover p-5 text-popover-foreground shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold" id="modal-title">
            {title}
          </h2>
          <Button
            aria-label="关闭"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

function CompactMode({
  onExpand,
  progress,
  snapshot,
}: {
  onExpand: () => void;
  progress: number;
  snapshot: TaskSnapshot;
}) {
  return (
    <main
      className="app-surface flex min-h-screen items-center justify-center p-6 text-foreground"
      onDoubleClick={onExpand}
    >
      <section
        aria-label="简洁下载状态"
        className="glass-panel w-full max-w-sm rounded-2xl border p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Download aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">Tide X</p>
              <p className="text-xs text-muted-foreground">双击恢复完整模式</p>
            </div>
          </div>
          <Badge variant="outline">{snapshot.summary.activeCount} active</Badge>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>当前进度</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <Progress label="当前下载总进度" value={progress} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric
            label="下载"
            value={`${formatBytes(snapshot.summary.downloadSpeed)}/s`}
          />
          <Metric
            label="上传"
            value={`${formatBytes(snapshot.summary.uploadSpeed)}/s`}
          />
        </div>
      </section>
    </main>
  );
}

function EmptyState({
  isLoading,
  onAdd,
}: {
  isLoading: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-card/82 p-8 text-center backdrop-blur-xl">
      <div className="max-w-md">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {isLoading ? (
            <RefreshCw
              aria-hidden="true"
              className="motion-safe:animate-spin"
            />
          ) : (
            <Download aria-hidden="true" />
          )}
        </div>
        <h2 className="mt-4 text-lg font-semibold">暂无下载任务</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          支持 HTTP/HTTPS、Magnet、torrent 和
          Metalink。添加后会在这里显示进度、速度和文件列表。
        </p>
        <Button className="mt-5" onClick={onAdd}>
          <Plus aria-hidden="true" data-icon="inline-start" />
          新建下载
        </Button>
      </div>
    </div>
  );
}

function RuntimeBadge({ runtime }: { runtime: RuntimeStatus }) {
  if (runtime.availability === "ready") {
    return <Badge variant="success">已连接</Badge>;
  }

  if (runtime.availability === "starting") {
    return <Badge variant="secondary">启动中</Badge>;
  }

  return <Badge variant="outline">未就绪</Badge>;
}

function TaskStateBadge({ state }: { state: DownloadTaskState }) {
  const labels: Record<DownloadTaskState, string> = {
    active: "下载中",
    completed: "完成",
    failed: "失败",
    paused: "暂停",
    queued: "等待",
    removed: "已移除",
    seeding: "做种",
  };

  const variant =
    state === "completed" || state === "active" || state === "seeding"
      ? "success"
      : state === "failed"
        ? "destructive"
        : "outline";

  return <Badge variant={variant}>{labels[state]}</Badge>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card/80 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}

function NumberField({
  label,
  min,
  onChange,
  value,
}: {
  label: string;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function OptionalNumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number | null) => void;
  value: number | null;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        min={0}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : null)
        }
        placeholder="不限速"
        type="number"
        value={value ?? ""}
      />
    </label>
  );
}

function getFilterCounts(tasks: DownloadTask[]): Record<TaskFilter, number> {
  return {
    all: tasks.length,
    active: tasks.filter(
      (task) => task.state === "active" || task.state === "seeding",
    ).length,
    queued: tasks.filter((task) => task.state === "queued").length,
    completed: tasks.filter((task) => task.state === "completed").length,
    failed: tasks.filter((task) => task.state === "failed").length,
  };
}

function calculateOverallProgress(snapshot: TaskSnapshot): number {
  const activeTasks = snapshot.tasks.filter(
    (task) => task.state === "active" || task.state === "seeding",
  );

  if (activeTasks.length === 0) {
    return 0;
  }

  return (
    activeTasks.reduce((total, task) => total + task.progress, 0) /
    activeTasks.length
  );
}

function formatBytes(value: number): string {
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

function formatRemaining(seconds: number | null): string {
  if (seconds === null) {
    return "剩余时间未知";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}
