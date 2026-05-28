import type { AppSettings, DownloadTask, RuntimeStatus } from "@shared/types";
import {
  FileDown,
  FolderOpen,
  MoreHorizontal,
  RefreshCw,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDownloads } from "@/hooks/use-downloads";
import { cn } from "@/lib/utils";
import { formatBytes, formatRemaining, getTaskBrand } from "./download-utils";
import { EmptyState, Metric, Sparkline, TaskStateBadge } from "./shared";
import type { DetailTab, MainView } from "./types";

export function DetailsPanel({
  actions,
  activeTab,
  activeView,
  onTabChange,
  runtime,
  settings,
  task,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  activeTab: DetailTab;
  activeView: MainView;
  onTabChange: (tab: DetailTab) => void;
  runtime: RuntimeStatus;
  settings: AppSettings | null;
  task: DownloadTask | null;
}) {
  if (activeView === "settings") {
    return (
      <aside className="min-h-0 overflow-auto border-l bg-white p-5 max-[860px]:hidden">
        <DetailHeading icon={Settings} title="Application" />
        <div className="mt-5 space-y-4 text-sm">
          <DetailRow label="Theme" value={settings?.theme ?? "system"} />
          <DetailRow
            label="Default Folder"
            value={settings?.downloadDirectory ?? "-"}
          />
          <DetailRow
            label="Engine"
            value={
              runtime.availability === "ready" ? "Connected" : "Unavailable"
            }
          />
          <DetailRow label="RPC Port" value={String(runtime.rpcPort ?? "-")} />
        </div>
      </aside>
    );
  }

  if (!task) {
    return (
      <aside className="min-h-0 overflow-auto border-l bg-white p-5 max-[860px]:hidden">
        <EmptyState
          icon={FileDown}
          isLoading={false}
          message="Select an item in the list to inspect transfer details."
          title="No item selected"
        />
      </aside>
    );
  }

  const brand = getTaskBrand(task.name);

  return (
    <aside className="min-h-0 overflow-auto border-l bg-white max-[860px]:hidden">
      <div className="border-b p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-sm",
              brand.className,
            )}
          >
            {brand.label}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-base font-semibold">{task.name}</h2>
            <TaskStateBadge state={task.state} />
          </div>
          <Button aria-label="More task actions" size="icon" variant="outline">
            <MoreHorizontal aria-hidden="true" size={16} />
          </Button>
        </div>
        <div className="mt-4 flex gap-2">
          {activeView === "history" ? (
            <Button size="sm">
              <RefreshCw aria-hidden="true" size={14} />
              Redownload
            </Button>
          ) : null}
          <Button
            onClick={() => void actions.revealFolder(task.gid)}
            size="sm"
            variant="outline"
          >
            <FolderOpen aria-hidden="true" size={14} />
            Open Folder
          </Button>
        </div>
      </div>

      <div className="flex border-b px-5">
        {(["overview", "files", "peers", "log"] as DetailTab[]).map((tab) => (
          <button
            className={cn(
              "h-10 border-b-2 px-3 text-xs font-medium capitalize transition-colors",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            key={tab}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-5 p-5">
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
    </aside>
  );
}

function OverviewDetails({ task }: { task: DownloadTask }) {
  return (
    <>
      <DetailRow label="Source (URL)" value={task.files[0]?.path ?? task.gid} />
      <DetailRow label="Save Path" value={task.files[0]?.path ?? "-"} />
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">Progress</span>
          <span>{Math.round(task.progress)}%</span>
        </div>
        <Progress label="Detail progress" value={task.progress} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Downloaded" value={formatBytes(task.completedLength)} />
        <Metric
          label="Total Size"
          value={task.totalLength ? formatBytes(task.totalLength) : "Unknown"}
        />
        <Metric
          label="Time Remaining"
          value={formatRemaining(task.remainingSeconds)}
        />
        <Metric label="Speed" value={`${formatBytes(task.downloadSpeed)}/s`} />
        <Metric label="Connections" value={String(task.connections)} />
        <Metric
          label="Peers"
          value={task.state === "seeding" ? "Active" : "-"}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">Speed (MB/s)</span>
          <span>{formatBytes(task.downloadSpeed)}/s</span>
        </div>
        <Sparkline />
      </div>
    </>
  );
}

function FilesDetails({ task }: { task: DownloadTask }) {
  if (task.files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No file information.</p>
    );
  }

  return (
    <div className="space-y-2">
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
    <div className="space-y-3 text-sm">
      <DetailRow label="Connections" value={String(task.connections)} />
      <DetailRow
        label="Upload Speed"
        value={`${formatBytes(task.uploadSpeed)}/s`}
      />
      <p className="text-muted-foreground">
        Peer details depend on aria2 torrent metadata and are shown when
        available.
      </p>
    </div>
  );
}

function LogDetails({ task }: { task: DownloadTask }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs">
      {task.errorMessage ?? "No log entries for this task."}
    </div>
  );
}

function DetailHeading({
  icon: Icon,
  title,
}: {
  icon: typeof FileDown;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b pb-3 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="break-all text-sm font-medium">{value}</span>
    </div>
  );
}
