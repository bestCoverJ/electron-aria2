import type { DownloadTaskState, RuntimeStatus } from "@shared/types";
import {
  ChevronDown,
  Download,
  FileUp,
  FolderOpen,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDownloads } from "@/hooks/use-downloads";
import { normalizeUserError } from "@/lib/tide-api";
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
    <Card
      className="min-w-0 bg-card/80 shadow-none"
      title={`${label}：${value}`}
    >
      <CardContent className="min-w-0 p-2 min-[1040px]:p-3">
        <p className="truncate text-[11px] text-muted-foreground min-[1040px]:text-xs">
          {label}
        </p>
        <p className="mt-1 truncate text-[11px] font-semibold tabular-nums min-[1040px]:text-sm">
          {value}
        </p>
      </CardContent>
    </Card>
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

export function Sparkline({
  label = "实时速度波形",
  value = 0,
}: {
  label?: string;
  value?: number;
}) {
  const historyRef = useRef<number[]>([]);
  const history = historyRef.current;

  history.push(Math.max(0, value));

  if (history.length > 24) {
    history.splice(0, history.length - 24);
  }

  const values = history.length > 1 ? history : [0, value, 0];
  const maxValue = Math.max(...values, 1);
  const points = values
    .map((item, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 120;
      const y = 24 - (item / maxValue) * 18;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="h-7 min-w-32 flex-1 overflow-hidden rounded-sm">
      <svg
        aria-label={label}
        className="h-full w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 120 28"
      >
        <polyline
          fill="none"
          points={points}
          stroke="hsl(var(--primary))"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          style={{ transition: "all 280ms ease" }}
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
  actionLabel = "新建下载",
  icon: Icon,
  isLoading,
  message,
  onAction,
  title,
}: {
  actionLabel?: string;
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
            {actionLabel === "新建下载" ? (
              <Plus aria-hidden="true" size={14} />
            ) : (
              <RefreshCw aria-hidden="true" size={14} />
            )}
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function Modal({
  children,
  closeDisabled = false,
  onClose,
  title,
}: {
  children: ReactElement;
  closeDisabled?: boolean;
  onClose: () => void;
  title: string;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabled) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDisabled, onClose]);

  return (
    <div
      aria-labelledby="modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === backdropRef.current && !closeDisabled) {
          onClose();
        }
      }}
      ref={backdropRef}
      role="dialog"
    >
      <section className="w-full max-w-xl rounded-lg border bg-popover p-5 text-popover-foreground shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold" id="modal-title">
            {title}
          </h2>
          <Button
            aria-label="关闭"
            disabled={closeDisabled}
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
  onError,
  recentDirectories,
  value,
}: {
  label: string;
  onBrowse: ReturnType<typeof useDownloads>["actions"]["selectDirectory"];
  onChange: (value: string) => void;
  onError?: (message: string) => void;
  recentDirectories: string[];
  value: string;
}) {
  const directories = Array.from(new Set(recentDirectories.filter(Boolean)));

  async function handleBrowse() {
    try {
      const result = await onBrowse({ defaultPath: value || undefined });

      if (!result.canceled && result.path) {
        onChange(result.path);
      }
    } catch (caught) {
      onError?.(normalizeUserError(caught));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium">{label}</span>
      <div className="grid grid-cols-[minmax(0,1fr)_2.25rem_2.25rem] gap-2">
        <Input
          className="h-9"
          onChange={(event) => onChange(event.target.value)}
          placeholder="输入保存目录"
          value={value}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="选择最近保存目录"
              disabled={directories.length === 0}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronDown aria-hidden="true" size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {directories.map((directory) => (
              <DropdownMenuItem
                className="max-w-80"
                key={directory}
                onClick={() => onChange(directory)}
              >
                <span className="truncate">{directory}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
  onError,
  onSelectFile,
  value,
}: {
  error: string | null;
  onChange: (value: string) => void;
  onError: (message: string | null) => void;
  onSelectFile: ReturnType<typeof useDownloads>["actions"]["selectTaskFile"];
  value: string;
}) {
  async function handleSelectFile() {
    onError(null);

    try {
      const result = await onSelectFile();

      if (!result.canceled && result.path) {
        onChange(result.path);
      }
    } catch (caught) {
      onError(normalizeUserError(caught));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium" htmlFor="download-source">
          任务来源
        </label>
        <Button
          aria-label="选择 torrent 或 Metalink 文件"
          onClick={() => void handleSelectFile()}
          size="sm"
          type="button"
          variant="outline"
        >
          <FileUp aria-hidden="true" size={14} />
          选择任务文件
        </Button>
      </div>
      <Textarea
        aria-describedby={
          error
            ? "download-source-help download-source-error"
            : "download-source-help"
        }
        aria-invalid={Boolean(error)}
        autoFocus
        id="download-source"
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://example.com/file.zip 或 magnet:?xt=..."
        value={value}
      />
      <span
        className="text-xs leading-5 text-muted-foreground"
        id="download-source-help"
      >
        粘贴 HTTP/HTTPS 或 Magnet 链接，也可以选择本地 torrent、Metalink 文件。
      </span>
    </div>
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
