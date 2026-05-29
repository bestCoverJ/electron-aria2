import type { ReactElement } from "react";
import { useMemo, useState } from "react";
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

  const visibleTasks = useMemo(
    () => getVisibleTasks(snapshot.tasks, activeView, query, statusFilter),
    [activeView, query, snapshot.tasks, statusFilter],
  );
  const selectedTask = selectedGid
    ? (snapshot.tasks.find((task) => task.gid === selectedGid) ?? null)
    : null;
  const overallProgress = calculateOverallProgress(snapshot);

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
          "grid min-h-0 min-w-0 flex-1 max-[860px]:grid-cols-[164px_minmax(0,1fr)]",
          selectedTask
            ? "grid-cols-[172px_minmax(320px,1fr)_328px]"
            : "grid-cols-[172px_minmax(0,1fr)]",
        )}
      >
        <AppSidebar
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            setSelectedGid(null);
            setDetailTab("overview");
          }}
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
          onSubmit={async (source, directory) => {
            const nextDirectory = directory.trim();
            await actions.add({
              source,
              directory: nextDirectory || undefined,
            });
            if (nextDirectory) {
              await actions.updateSettings({
                downloadDirectory: nextDirectory,
                recentDownloadDirectories: [
                  nextDirectory,
                  ...(settings?.recentDownloadDirectories ?? []),
                ],
              });
            }
            setIsAddOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}
