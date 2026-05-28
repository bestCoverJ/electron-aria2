import type { RuntimeStatus } from "@shared/types";
import {
  ChevronsUpDown,
  Download,
  History,
  Settings,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EngineLine } from "./shared";
import type { MainView, MenuItem } from "./types";

const menuItems: MenuItem[] = [
  { id: "downloads", label: "Download List", icon: Download },
  { id: "history", label: "History", icon: History },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  activeView,
  onCompact,
  onViewChange,
  runtime,
}: {
  activeView: MainView;
  onCompact: () => Promise<void>;
  onViewChange: (view: MainView) => void;
  runtime: RuntimeStatus;
}) {
  return (
    <aside className="shell-glass flex min-h-0 flex-col border-r">
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <Download aria-hidden="true" size={16} />
        </div>
        <span className="truncate text-sm font-semibold">Downloader</span>
      </div>

      <nav className="flex flex-1 flex-col gap-2 p-3" aria-label="主菜单">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const selected = activeView === item.id;

          return (
            <button
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md border border-transparent px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-blue-100 bg-white text-primary shadow-sm"
                  : "text-foreground/80 hover:bg-white/70 hover:text-primary",
              )}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              type="button"
            >
              <Icon aria-hidden="true" size={17} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t px-4 py-3">
        <div className="space-y-1.5 text-xs">
          <EngineLine label="Download Engine" runtime={runtime} />
          <EngineLine label="Connected" runtime={runtime} />
        </div>
        <Button
          className="mt-3 w-full"
          onClick={() => void onCompact()}
          size="sm"
          variant="outline"
        >
          <ChevronsUpDown aria-hidden="true" size={14} />
          Compact
        </Button>
      </div>
    </aside>
  );
}
