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
import type { DetailTab, MainView } from "@/components/downloader/types";
import { useDownloads } from "@/hooks/use-downloads";

export function App(): ReactElement {
  const { actions, error, isLoading, settings, snapshot } = useDownloads();
  const [activeView, setActiveView] = useState<MainView>("downloads");
  const [query, setQuery] = useState("");
  const [selectedGid, setSelectedGid] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [isCompactMode, setIsCompactMode] = useState(
    () => window.location.hash === "#compact",
  );
  const [isAddOpen, setIsAddOpen] = useState(false);

  const visibleTasks = useMemo(
    () => getVisibleTasks(snapshot.tasks, activeView, query),
    [activeView, query, snapshot.tasks],
  );
  const selectedTask =
    visibleTasks.find((task) => task.gid === selectedGid) ??
    visibleTasks.at(0) ??
    null;
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
    <main className="app-surface flex min-h-screen flex-col overflow-hidden text-foreground">
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[172px_minmax(320px,1fr)_328px] max-[860px]:grid-cols-[164px_minmax(0,1fr)]">
        <AppSidebar
          activeView={activeView}
          onCompact={async () => {
            await actions.enterCompactMode();
            setIsCompactMode(true);
          }}
          onViewChange={(view) => {
            setActiveView(view);
            setDetailTab("overview");
          }}
          runtime={snapshot.runtime}
        />

        <WorkspacePanel
          actions={actions}
          activeView={activeView}
          error={error}
          isLoading={isLoading}
          onAdd={() => setIsAddOpen(true)}
          onSelectTask={setSelectedGid}
          query={query}
          selectedGid={selectedTask?.gid ?? null}
          setQuery={setQuery}
          settings={settings}
          tasks={visibleTasks}
        />

        <DetailsPanel
          actions={actions}
          activeTab={detailTab}
          activeView={activeView}
          onTabChange={setDetailTab}
          runtime={snapshot.runtime}
          settings={settings}
          task={selectedTask}
        />
      </div>

      <StatusBar progress={overallProgress} snapshot={snapshot} />

      {isAddOpen ? (
        <AddDownloadDialog
          defaultDirectory={settings?.downloadDirectory ?? ""}
          recentDirectories={settings?.recentDownloadDirectories ?? []}
          onClose={() => setIsAddOpen(false)}
          onSelectDirectory={actions.selectDirectory}
          onSubmit={async (source, directory) => {
            await actions.add({ source, directory: directory || undefined });
            if (directory.trim()) {
              await actions.updateSettings({
                recentDownloadDirectories: [
                  directory.trim(),
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
