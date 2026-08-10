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
    message: "运行状态不可用。",
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

  const refresh = useCallback(async (clearErrorOnSuccess = true) => {
    try {
      const tide = getTideApi();
      const [nextSnapshot, nextSettings] = await Promise.all([
        tide.downloads.getSnapshot(),
        tide.settings.get(),
      ]);
      setSnapshot(nextSnapshot);
      setSettings(nextSettings);
      if (clearErrorOnSuccess) {
        setError(null);
      }
    } catch (caught) {
      setError(normalizeUserError(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => {
      void refresh(false);
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const actions = useMemo(() => {
    async function runAction<T>(
      operation: () => Promise<T>,
      rethrow = false,
    ): Promise<T | undefined> {
      setError(null);

      try {
        return await operation();
      } catch (caught) {
        setError(normalizeUserError(caught));

        if (rethrow) {
          throw caught;
        }

        return undefined;
      }
    }

    return {
      add: async (input: AddDownloadInput) => {
        await runAction(async () => {
          const tide = getTideApi();
          await tide.downloads.add(input);
          await refresh();
        }, true);
      },
      pause: async (gid: string) => {
        await runAction(async () => {
          await getTideApi().downloads.pause(gid);
          await refresh();
        });
      },
      resume: async (gid: string) => {
        await runAction(async () => {
          await getTideApi().downloads.resume(gid);
          await refresh();
        });
      },
      remove: async (gid: string, removeFiles = false) => {
        await runAction(async () => {
          await getTideApi().downloads.remove(gid, { removeFiles });
          await refresh();
        }, true);
      },
      retry: async (gid: string) => {
        await runAction(async () => {
          await getTideApi().downloads.retry(gid);
          await refresh();
        });
      },
      clearAll: async () => {
        await runAction(async () => {
          await getTideApi().downloads.clearAll();
          await refresh();
        });
      },
      clearCompleted: async () => {
        await runAction(async () => {
          await getTideApi().downloads.clearCompleted();
          await refresh();
        });
      },
      retryFailed: async () => {
        await runAction(async () => {
          await getTideApi().downloads.retryFailed();
          await refresh();
        });
      },
      revealFile: async (gid: string) => {
        await runAction(() => getTideApi().downloads.revealFile(gid));
      },
      revealFolder: async (gid: string) => {
        await runAction(() => getTideApi().downloads.revealFolder(gid));
      },
      selectTaskFile: () => {
        const selectTaskFile = getTideApi().downloads.selectTaskFile;

        if (!selectTaskFile) {
          throw new Error(
            "任务文件选择服务暂不可用，请确认正在 Tide X 桌面窗口中运行。",
          );
        }

        return selectTaskFile();
      },
      selectDirectory: (
        options?: SelectDirectoryOptions,
      ): Promise<SelectDirectoryResult> => {
        const selectDirectory = getTideApi().settings.selectDirectory;

        if (!selectDirectory) {
          throw new Error(
            "文件夹选择服务暂不可用，请确认正在 Tide X 桌面窗口中运行。",
          );
        }

        return selectDirectory(options);
      },
      enterCompactMode: () =>
        getTideApi().appWindow?.enterCompactMode?.() ?? Promise.resolve(),
      exitCompactMode: () =>
        getTideApi().appWindow?.exitCompactMode?.() ?? Promise.resolve(),
      updateSettings: async (patch: Partial<AppSettings>) => {
        await runAction(async () => {
          const nextSettings = await getTideApi().settings.update(patch);
          setSettings(nextSettings);
          await refresh();
        }, true);
      },
      refresh,
      clearError: () => setError(null),
    };
  }, [refresh]);

  return {
    actions,
    error,
    isLoading,
    settings,
    snapshot,
  };
}
