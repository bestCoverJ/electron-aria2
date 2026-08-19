import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { AddDownloadDialog } from "@/components/downloader/AddDownloadDialog";
import { AppSidebar } from "@/components/downloader/AppSidebar";
import { CompactMode } from "@/components/downloader/CompactMode";
import { DetailsPanel } from "@/components/downloader/DetailsPanel";
import { StatusBar } from "@/components/downloader/StatusBar";
import { WorkspacePanel } from "@/components/downloader/WorkspacePanel";
import {
  calculateOverallProgress,
  getVisibleTasks,
} from "@/components/downloader/download-utils";
import type { DownloadStatusFilter } from "@/components/downloader/download-utils";
import type { DetailTab, MainView } from "@/components/downloader/types";
import { useDownloads } from "@/hooks/use-downloads";
import { cn } from "@/lib/utils";

export function App(): ReactElement {
  const { actions, error, isLoading, settings, snapshot } = useDownloads();
  const [activeView, setActiveView] = useState<MainView>("downloads");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DownloadStatusFilter>("all");
  const [selectedGid, setSelectedGid] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [isCompactMode, setIsCompactMode] = useState(
    () => window.location.hash === "#compact",
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const visibleTasks = useMemo(
    () => getVisibleTasks(snapshot.tasks, activeView, query, statusFilter),
    [activeView, query, snapshot.tasks, statusFilter],
  );
  const selectedTask = selectedGid
    ? (snapshot.tasks.find((task) => task.gid === selectedGid) ?? null)
    : null;
  const overallProgress = calculateOverallProgress(snapshot);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const useDarkTheme =
        settings?.theme === "dark" ||
        (settings?.theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", useDarkTheme);
    };

    applyTheme();
    media.addEventListener("change", applyTheme);

    return () => media.removeEventListener("change", applyTheme);
  }, [settings?.theme]);

  if (isCompactMode) {
    return (
      <CompactMode
        onExpand={() => setIsCompactMode(false)}
        onRequestExpand={async () => {
          await actions.exitCompactMode();
          setIsCompactMode(false);
        }}
        progress={overallProgress}
        snapshot={snapshot}
      />
    );
  }

  return (
    <main className="app-surface flex h-screen min-h-0 flex-col overflow-hidden text-foreground">
      <div
        className={cn(
          "grid min-h-0 min-w-0 flex-1",
          isSidebarCollapsed
            ? selectedTask
              ? "grid-cols-[64px_minmax(188px,1fr)_minmax(300px,328px)]"
              : "grid-cols-[64px_minmax(0,1fr)]"
            : selectedTask
              ? "grid-cols-[172px_minmax(188px,1fr)_minmax(300px,328px)]"
              : "grid-cols-[172px_minmax(0,1fr)]",
          isSidebarCollapsed
            ? selectedTask
              ? "max-[860px]:grid-cols-[64px_minmax(172px,1fr)_minmax(284px,304px)]"
              : "max-[860px]:grid-cols-[64px_minmax(0,1fr)]"
            : selectedTask
              ? "max-[860px]:grid-cols-[164px_minmax(172px,1fr)_minmax(284px,304px)]"
              : "max-[860px]:grid-cols-[164px_minmax(0,1fr)]",
        )}
      >
        <AppSidebar
          activeView={activeView}
          collapsed={isSidebarCollapsed}
          onViewChange={(view) => {
            setActiveView(view);
            setSelectedGid(null);
            setDetailTab("overview");
          }}
          onToggleCollapsed={() =>
            setIsSidebarCollapsed((collapsed) => !collapsed)
          }
        />

        <WorkspacePanel
          actions={actions}
          activeView={activeView}
          error={error}
          isLoading={isLoading}
          onAdd={() => setIsAddOpen(true)}
          onClearTaskSelection={() => setSelectedGid(null)}
          onSelectTask={setSelectedGid}
          query={query}
          selectedGid={selectedGid}
          setQuery={setQuery}
          setStatusFilter={setStatusFilter}
          settings={settings}
          statusFilter={statusFilter}
          tasks={visibleTasks}
        />

        {selectedTask ? (
          <DetailsPanel
            actions={actions}
            activeTab={detailTab}
            activeView={activeView}
            onTabChange={setDetailTab}
            task={selectedTask}
          />
        ) : null}
      </div>

      <StatusBar progress={overallProgress} snapshot={snapshot} />

      {isAddOpen ? (
        <AddDownloadDialog
          defaultDirectory={settings?.downloadDirectory ?? ""}
          recentDirectories={settings?.recentDownloadDirectories ?? []}
          onClose={() => setIsAddOpen(false)}
          onSelectDirectory={actions.selectDirectory}
          onSelectTaskFiles={actions.selectTaskFiles}
          onSubmit={async ({ directory, fileName, sources }) => {
            const nextDirectory = directory.trim();
            if (nextDirectory) {
              await actions.updateSettings({
                downloadDirectory: nextDirectory,
                recentDownloadDirectories: [
                  nextDirectory,
                  ...(settings?.recentDownloadDirectories ?? []),
                ],
              });
            }
            if (sources.length === 1 && fileName) {
              await actions.add({
                source: sources[0],
                directory: nextDirectory || undefined,
                fileName,
              });

              return {
                items: [{ source: sources[0], status: "created" as const }],
                createdCount: 1,
                failedCount: 0,
                skippedCount: 0,
              };
            }

            return actions.addBatch({
              sources,
              directory: nextDirectory || undefined,
            });
          }}
        />
      ) : null}
    </main>
  );
}
