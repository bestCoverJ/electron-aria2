import type { TaskSnapshot } from "@shared/types";
import { ChevronsUpDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  getCompletedBytes,
  getTotalBytes,
} from "./download-utils";
import { EngineLine, Sparkline } from "./shared";

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
        label="Overall Progress"
        value={`${formatBytes(getCompletedBytes(snapshot.tasks))} of ${formatBytes(
          getTotalBytes(snapshot.tasks),
        )}`}
      />
      <div className="flex items-center gap-3 border-l px-4">
        <span className="w-10 text-xs text-muted-foreground">
          {Math.round(progress)}%
        </span>
        <Progress
          className="h-1.5"
          label="Overall download progress"
          value={progress}
        />
      </div>
      <div className="flex items-center gap-4 border-l px-4 max-[900px]:hidden">
        <StatusBlock
          compact
          label="Speed"
          value={`${formatBytes(snapshot.summary.downloadSpeed)}/s`}
        />
        <Sparkline />
      </div>
      <div className="flex items-center justify-between border-l px-4">
        <EngineLine label="Download Engine" runtime={snapshot.runtime} />
        <ChevronsUpDown aria-hidden="true" size={15} />
      </div>
    </footer>
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
