import type { TaskSnapshot } from "@shared/types";
import { useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  getCompletedBytes,
  getTotalBytes,
} from "./download-utils";
import { EngineLine } from "./shared";

export function StatusBar({
  progress,
  snapshot,
}: {
  progress: number;
  snapshot: TaskSnapshot;
}) {
  return (
    <footer className="status-glass grid h-14 shrink-0 grid-cols-[minmax(190px,0.9fr)_220px_minmax(180px,1fr)_226px] max-[900px]:grid-cols-[minmax(140px,1fr)_112px_minmax(112px,0.75fr)_158px]">
      <StatusBlock
        label="总进度"
        value={`${formatBytes(getCompletedBytes(snapshot.tasks))} / ${formatBytes(
          getTotalBytes(snapshot.tasks),
        )}`}
      />
      <div className="flex items-center gap-3 border-l px-4 max-[900px]:gap-2 max-[900px]:px-3">
        <span className="w-10 text-xs text-muted-foreground">
          {Math.round(progress)}%
        </span>
        <Progress className="h-1.5" label="总下载进度" value={progress} />
      </div>
      <div className="flex items-center gap-4 border-l px-4 max-[900px]:px-3">
        <StatusBlock
          compact
          label="速度"
          value={`${formatBytes(snapshot.summary.downloadSpeed)}/s`}
        />
        <div className="min-w-0 flex-1 max-[900px]:hidden">
          <SpeedWaveform totalSpeed={snapshot.summary.downloadSpeed} />
        </div>
      </div>
      <div className="flex items-center border-l px-4 max-[900px]:px-3">
        <EngineLine
          label={getEngineStatusLabel(snapshot.runtime.availability)}
          runtime={snapshot.runtime}
          title={snapshot.runtime.message ?? undefined}
        />
      </div>
    </footer>
  );
}

function getEngineStatusLabel(
  availability: TaskSnapshot["runtime"]["availability"],
) {
  if (availability === "ready") {
    return "引擎连接成功";
  }

  if (availability === "starting") {
    return "引擎连接中";
  }

  return "引擎加载失败";
}

function SpeedWaveform({ totalSpeed }: { totalSpeed: number }) {
  const historyRef = useRef<number[]>([]);
  const history = historyRef.current;

  if (totalSpeed <= 0 && history.length === 0) {
    history.push(0, 0, 0);
  }

  history.push(Math.max(0, totalSpeed));

  if (history.length > 24) {
    history.splice(0, history.length - 24);
  }

  const values = history.length > 1 ? history : [0, totalSpeed, 0];
  const maxValue = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 120;
      const y = 24 - (value / maxValue) * 18;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="h-7 min-w-32 flex-1 overflow-hidden rounded-sm">
      <svg
        aria-label="实时下载速度波形"
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

function StatusBlock({
  compact = false,
  label,
  value,
}: {
  compact?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-center px-4 max-[900px]:px-3",
        compact && "px-0 max-[900px]:px-0",
      )}
      title={`${label}：${value}`}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-0.5 truncate text-xs font-medium">{value}</span>
    </div>
  );
}
