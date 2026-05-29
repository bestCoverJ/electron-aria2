import type { DownloadTaskState, RuntimeStatus } from "@shared/types";
import { Download, FolderOpen, Plus, RefreshCw, X } from "lucide-react";
import type { ReactElement } from "react";
import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDownloads } from "@/hooks/use-downloads";
import { cn } from "@/lib/utils";
import { formatBytes } from "./download-utils";

export function EngineLine({
  label,
  runtime,
  title,
}: {
  label: string;
  runtime: RuntimeStatus;
  title?: string;
}) {
  const connected = runtime.availability === "ready";
  const failed = runtime.availability === "unavailable";

  return (
    <div className="flex items-center gap-2 text-xs" title={title}>
      <span
        className={cn(
          "size-2 rounded-full",
          connected ? "bg-emerald-500" : failed ? "bg-red-500" : "bg-amber-500",
        )}
      />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card/80 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

export function NumberField({
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
    <label className="grid gap-2">
      <span className="text-xs font-medium">{label}</span>
      <Input
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

export function OptionalNumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number | null) => void;
  value: number | null;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium">{label}</span>
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

export function Sparkline() {
  return (
    <div className="h-7 min-w-32 flex-1 overflow-hidden rounded-sm">
      <svg
        aria-hidden="true"
        className="h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 120 28"
      >
        <polyline
          fill="none"
          points="0,19 10,17 20,20 30,15 40,18 50,13 60,14 70,10 80,15 90,12 100,16 110,13 120,15"
          stroke="hsl(var(--primary))"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export function TaskStateBadge({ state }: { state: DownloadTaskState }) {
  const labels: Record<DownloadTaskState, string> = {
    active: "进行中",
    completed: "已完成",
    failed: "下载失败",
    paused: "暂停",
    queued: "未开始",
    removed: "停止下载",
    seeding: "进行中",
  };

  const variant =
    state === "completed" || state === "active" || state === "seeding"
      ? "success"
      : state === "failed"
        ? "destructive"
        : "outline";

  return (
    <Badge className="shrink-0 whitespace-nowrap" variant={variant}>
      {labels[state]}
    </Badge>
  );
}

export function EmptyState({
  icon: Icon,
  isLoading,
  message,
  onAction,
  title,
}: {
  icon: typeof Download;
  isLoading: boolean;
  message: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {isLoading ? (
            <RefreshCw
              aria-hidden="true"
              className="motion-safe:animate-spin"
            />
          ) : (
            <Icon aria-hidden="true" />
          )}
        </div>
        <h2 className="mt-4 text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {onAction ? (
          <Button className="mt-5" onClick={onAction}>
            <Plus aria-hidden="true" size={14} />
            新建下载
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function Modal({
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
            <X aria-hidden="true" size={16} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function DirectoryField({
  label,
  onBrowse,
  onChange,
  recentDirectories,
  value,
}: {
  label: string;
  onBrowse: ReturnType<typeof useDownloads>["actions"]["selectDirectory"];
  onChange: (value: string) => void;
  recentDirectories: string[];
  value: string;
}) {
  const listId = useId();
  const directories = Array.from(new Set(recentDirectories.filter(Boolean)));

  async function handleBrowse() {
    const result = await onBrowse({ defaultPath: value || undefined });

    if (!result.canceled && result.path) {
      onChange(result.path);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium">{label}</span>
      <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
        <Input
          className="h-9"
          list={listId}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            directories.length > 0 ? "输入或选择保存目录" : "输入保存目录"
          }
          value={value}
        />
        <datalist id={listId}>
          {directories.map((directory) => (
            <option key={directory} value={directory} />
          ))}
        </datalist>
        <Button
          aria-label="选择保存目录"
          onClick={() => void handleBrowse()}
          size="icon"
          type="button"
          variant="outline"
        >
          <FolderOpen aria-hidden="true" size={15} />
        </Button>
      </div>
    </div>
  );
}

export function SourceField({
  error,
  onChange,
  value,
}: {
  error: string | null;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">任务来源</span>
      <Textarea
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://example.com/file.zip 或 magnet:?xt=..."
        value={value}
      />
    </label>
  );
}

export function TransferMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return <Metric label={label} value={`${formatBytes(value)}/s`} />;
}
