import type { TaskSnapshot } from "@shared/types";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "./download-utils";
import { Metric } from "./shared";

export function CompactMode({
  onExpand,
  onRequestExpand,
  progress,
  snapshot,
}: {
  onExpand: () => void;
  onRequestExpand: () => Promise<void>;
  progress: number;
  snapshot: TaskSnapshot;
}) {
  async function handleExpand() {
    try {
      await onRequestExpand();
    } catch {
      onExpand();
    }
  }

  return (
    <main
      className="compact-surface flex min-h-screen items-center justify-center p-4 text-foreground"
      onDoubleClick={() => void handleExpand()}
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
          <Badge variant="outline">{snapshot.summary.activeCount} 个活动</Badge>
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
