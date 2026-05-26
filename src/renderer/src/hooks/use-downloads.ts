import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AddDownloadInput,
  AppSettings,
  TaskSnapshot,
} from "@shared/types";

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
      const [nextSnapshot, nextSettings] = await Promise.all([
        window.tide.downloads.getSnapshot(),
        window.tide.settings.get(),
      ]);
      setSnapshot(nextSnapshot);
      setSettings(nextSettings);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error.");
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
        await window.tide.downloads.add(input);
        await refresh();
      },
      pause: async (gid: string) => {
        await window.tide.downloads.pause(gid);
        await refresh();
      },
      resume: async (gid: string) => {
        await window.tide.downloads.resume(gid);
        await refresh();
      },
      remove: async (gid: string, removeFiles = false) => {
        await window.tide.downloads.remove(gid, { removeFiles });
        await refresh();
      },
      retry: async (gid: string) => {
        await window.tide.downloads.retry(gid);
        await refresh();
      },
      revealFile: (gid: string) => window.tide.downloads.revealFile(gid),
      revealFolder: (gid: string) => window.tide.downloads.revealFolder(gid),
      updateSettings: async (patch: Partial<AppSettings>) => {
        const nextSettings = await window.tide.settings.update(patch);
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
