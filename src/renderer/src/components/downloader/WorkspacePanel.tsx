import type { AppSettings, DownloadTask } from "@shared/types";
import {
  List,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useDownloads } from "@/hooks/use-downloads";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  formatDate,
  getEmptyMessage,
  getEmptyTitle,
  getTaskBrand,
  getViewIcon,
  getViewTitle,
} from "./download-utils";
import { EmptyState, TaskStateBadge } from "./shared";
import { SettingsWorkspace } from "./SettingsWorkspace";
import type { MainView } from "./types";

export function WorkspacePanel({
  actions,
  activeView,
  error,
  isLoading,
  onAdd,
  onSelectTask,
  query,
  selectedGid,
  setQuery,
  settings,
  tasks,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  activeView: MainView;
  error: string | null;
  isLoading: boolean;
  onAdd: () => void;
  onSelectTask: (gid: string) => void;
  query: string;
  selectedGid: string | null;
  setQuery: (query: string) => void;
  settings: AppSettings | null;
  tasks: DownloadTask[];
}) {
  if (activeView === "settings") {
    return (
      <section className="flex min-h-0 flex-col bg-white">
        <WorkspaceHeader
          count={0}
          onAdd={onAdd}
          query={query}
          setQuery={setQuery}
          title="Settings"
          variant="settings"
        />
        {settings ? (
          <SettingsWorkspace actions={actions} settings={settings} />
        ) : (
          <EmptyState
            icon={Settings}
            isLoading={isLoading}
            message="设置尚未加载。"
            title="Settings unavailable"
          />
        )}
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col bg-white">
      <WorkspaceHeader
        count={tasks.length}
        onAdd={onAdd}
        query={query}
        setQuery={setQuery}
        title={getViewTitle(activeView)}
        variant={activeView}
      />
      {error ? (
        <div className="mx-4 mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {tasks.length === 0 ? (
        <EmptyState
          icon={getViewIcon(activeView)}
          isLoading={isLoading}
          message={getEmptyMessage(activeView)}
          onAction={activeView === "downloads" ? onAdd : undefined}
          title={getEmptyTitle(activeView)}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
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
      <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
        {tasks.length} items
      </div>
    </section>
  );
}

function WorkspaceHeader({
  count,
  onAdd,
  query,
  setQuery,
  title,
  variant,
}: {
  count: number;
  onAdd: () => void;
  query: string;
  setQuery: (query: string) => void;
  title: string;
  variant: MainView;
}) {
  return (
    <header className="flex h-12 items-center gap-3 border-b px-4">
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h1>
      {variant !== "settings" ? (
        <Badge className="shrink-0" variant="secondary">
          {count}
        </Badge>
      ) : null}
      {variant === "downloads" ? (
        <Button onClick={onAdd} size="sm">
          <Plus aria-hidden="true" size={14} />
          New
        </Button>
      ) : null}
      {variant !== "settings" ? (
        <>
          <label className="relative w-36">
            <span className="sr-only">Search</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={15}
            />
            <Input
              className="h-8 pl-8"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              value={query}
            />
          </label>
          <Button aria-label="List density" size="icon" variant="ghost">
            <List aria-hidden="true" size={16} />
          </Button>
          <Button aria-label="More actions" size="icon" variant="ghost">
            <MoreHorizontal aria-hidden="true" size={16} />
          </Button>
        </>
      ) : null}
    </header>
  );
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
  const brand = getTaskBrand(task.name);

  return (
    <article
      className={cn(
        "task-row flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 transition-colors focus-within:ring-2 focus-within:ring-ring",
        selected
          ? "border-blue-200 bg-blue-50/75"
          : "border-transparent bg-white hover:border-blue-100 hover:bg-blue-50/40",
      )}
      onClick={() => onSelect(task.gid)}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm",
          brand.className,
        )}
      >
        {brand.label}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-sm font-semibold">{task.name}</h2>
          {view === "history" ? <TaskStateBadge state={task.state} /> : null}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatBytes(task.completedLength)}</span>
          {task.totalLength ? (
            <span>of {formatBytes(task.totalLength)}</span>
          ) : null}
          {view === "history" ? (
            <span>{formatDate(task.updatedAt)}</span>
          ) : null}
        </div>
        {view === "downloads" || view === "trash" ? (
          <div className="mt-2 flex items-center gap-3">
            <Progress
              className="h-1.5"
              label={`${task.name} progress`}
              value={task.progress}
            />
            <span className="w-9 text-right text-xs text-muted-foreground">
              {Math.round(task.progress)}%
            </span>
          </div>
        ) : null}
      </div>
      {view === "history" ? (
        <Badge variant="success">Completed</Badge>
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
  if (task.state === "active" || task.state === "seeding") {
    return (
      <Button
        aria-label="Pause download"
        onClick={(event) => {
          event.stopPropagation();
          void actions.pause(task.gid);
        }}
        size="icon"
        variant="outline"
      >
        <Pause aria-hidden="true" size={15} />
      </Button>
    );
  }

  if (task.state === "failed") {
    return (
      <Button
        aria-label="Retry download"
        onClick={(event) => {
          event.stopPropagation();
          void actions.retry(task.gid);
        }}
        size="icon"
        variant="outline"
      >
        <RotateCcw aria-hidden="true" size={15} />
      </Button>
    );
  }

  return (
    <Button
      aria-label="Resume download"
      onClick={(event) => {
        event.stopPropagation();
        void actions.resume(task.gid);
      }}
      size="icon"
      variant="outline"
    >
      <Play aria-hidden="true" size={15} />
    </Button>
  );
}
