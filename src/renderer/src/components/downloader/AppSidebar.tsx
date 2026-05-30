import {
  Download,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MainView, MenuItem } from "./types";

const menuItems: MenuItem[] = [
  { id: "downloads", label: "下载列表", icon: Download },
  { id: "history", label: "历史记录", icon: History },
  { id: "trash", label: "垃圾箱", icon: Trash2 },
  { id: "settings", label: "设置", icon: Settings },
];

export function AppSidebar({
  activeView,
  collapsed,
  onToggleCollapsed,
  onViewChange,
}: {
  activeView: MainView;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onViewChange: (view: MainView) => void;
}) {
  return (
    <aside className="shell-glass flex min-h-0 flex-col">
      <div className="flex h-12 items-center px-3">
        <Button
          aria-label={collapsed ? "展开菜单" : "收起菜单"}
          className="h-9 w-9 px-0"
          onClick={onToggleCollapsed}
          title={collapsed ? "展开菜单" : "收起菜单"}
          type="button"
          variant="ghost"
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" size={18} />
          ) : (
            <PanelLeftClose aria-hidden="true" size={18} />
          )}
        </Button>
      </div>

      <nav
        className={cn("flex flex-1 flex-col gap-2 p-3", collapsed && "px-2")}
        aria-label="主菜单"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const selected = activeView === item.id;

          return (
            <Button
              aria-current={selected ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "h-10 justify-start gap-3 border border-transparent px-3 text-sm",
                collapsed && "justify-center px-0",
                selected
                  ? "border-blue-100 bg-white text-primary shadow-sm hover:bg-white hover:text-primary"
                  : "text-foreground/80 hover:bg-white/70 hover:text-primary",
              )}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              title={collapsed ? item.label : undefined}
              type="button"
              variant="ghost"
            >
              <Icon aria-hidden="true" size={17} />
              {collapsed ? null : (
                <span className="truncate">{item.label}</span>
              )}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
