import type { DownloadTask, TaskSnapshot } from "@shared/types";
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
    <footer className="grid h-14 shrink-0 grid-cols-[minmax(190px,0.9fr)_220px_minmax(180px,1fr)_226px] border-t bg-white/88 backdrop-blur-xl max-[900px]:grid-cols-[1fr_180px_210px]">
      <StatusBlock
        label="总进度"
        value={`${formatBytes(getCompletedBytes(snapshot.tasks))} / ${formatBytes(
          getTotalBytes(snapshot.tasks),
        )}`}
      />
      <div className="flex items-center gap-3 border-l px-4">
        <span className="w-10 text-xs text-muted-foreground">
          {Math.round(progress)}%
        </span>
        <Progress className="h-1.5" label="总下载进度" value={progress} />
      </div>
      <div className="flex items-center gap-4 border-l px-4 max-[900px]:hidden">
        <StatusBlock
          compact
          label="速度"
          value={`${formatBytes(snapshot.summary.downloadSpeed)}/s`}
        />
        <SpeedWaveform
          tasks={snapshot.tasks}
          totalSpeed={snapshot.summary.downloadSpeed}
        />
      </div>
      <div className="flex items-center border-l px-4">
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

function SpeedWaveform({
  tasks,
  totalSpeed,
}: {
  tasks: DownloadTask[];
  totalSpeed: number;
}) {
  const activeSpeeds = tasks
    .map((task) => task.downloadSpeed)
    .filter((speed) => speed > 0);

  if (totalSpeed <= 0 || activeSpeeds.length === 0) {
    return <div aria-hidden="true" className="h-7 min-w-32 flex-1" />;
  }

  const values = Array.from({ length: 12 }, (_, index) => {
    const base = activeSpeeds[index % activeSpeeds.length] ?? totalSpeed;
    const variation = 0.72 + ((index * 37) % 10) / 25;

    return Math.max(1, Math.round(base * variation));
  });
  const maxValue = Math.max(totalSpeed, ...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 120;
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
    <div className={cn("flex flex-col justify-center px-4", compact && "px-0")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-0.5 truncate text-xs font-medium">{value}</span>
    </div>
  );
}
