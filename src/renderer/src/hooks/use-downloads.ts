import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AddDownloadInput,
  AppSettings,
  SelectDirectoryOptions,
  SelectDirectoryResult,
  TaskSnapshot,
} from "@shared/types";
import { getTideApi, normalizeUserError } from "@/lib/tide-api";

const fallbackSnapshot: TaskSnapshot = {
  tasks: [],
  summary: {
    activeCount: 0,
    queuedCount: 0,
    completedCount: 0,
    failedCount: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
  },
  runtime: {
    availability: "unavailable",
    message: "Runtime status is unavailable.",
    pid: null,
    rpcPort: null,
    startedAt: null,
  },
  capturedAt: new Date().toISOString(),
};

export function useDownloads() {
  const [snapshot, setSnapshot] = useState<TaskSnapshot>(fallbackSnapshot);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const tide = getTideApi();
      const [nextSnapshot, nextSettings] = await Promise.all([
        tide.downloads.getSnapshot(),
        tide.settings.get(),
      ]);
      setSnapshot(nextSnapshot);
      setSettings(nextSettings);
      setError(null);
    } catch (caught) {
      setError(normalizeUserError(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const actions = useMemo(
    () => ({
      add: async (input: AddDownloadInput) => {
        const tide = getTideApi();
        await tide.downloads.add(input);
        await refresh();
      },
      pause: async (gid: string) => {
        const tide = getTideApi();
        await tide.downloads.pause(gid);
        await refresh();
      },
      resume: async (gid: string) => {
        const tide = getTideApi();
        await tide.downloads.resume(gid);
        await refresh();
      },
      remove: async (gid: string, removeFiles = false) => {
        const tide = getTideApi();
        await tide.downloads.remove(gid, { removeFiles });
        await refresh();
      },
      retry: async (gid: string) => {
        const tide = getTideApi();
        await tide.downloads.retry(gid);
        await refresh();
      },
      revealFile: (gid: string) => getTideApi().downloads.revealFile(gid),
      revealFolder: (gid: string) => getTideApi().downloads.revealFolder(gid),
      selectDirectory: (
        options?: SelectDirectoryOptions,
      ): Promise<SelectDirectoryResult> =>
        getTideApi().settings.selectDirectory(options),
      enterCompactMode: () => getTideApi().appWindow.enterCompactMode(),
      exitCompactMode: () => getTideApi().appWindow.exitCompactMode(),
      updateSettings: async (patch: Partial<AppSettings>) => {
        const nextSettings = await getTideApi().settings.update(patch);
        setSettings(nextSettings);
        await refresh();
      },
    }),
    [refresh],
  );

  return {
    actions,
    error,
    isLoading,
    settings,
    snapshot,
  };
}
