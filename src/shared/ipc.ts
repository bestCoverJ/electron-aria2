export const ipcChannels = {
  windowEnterCompactMode: "window:enter-compact-mode",
  windowExitCompactMode: "window:exit-compact-mode",
  settingsGet: "settings:get",
  settingsUpdate: "settings:update",
  settingsSelectDirectory: "settings:select-directory",
  runtimeGetStatus: "runtime:get-status",
  downloadsAdd: "downloads:add",
  downloadsSelectTaskFile: "downloads:select-task-file",
  downloadsPause: "downloads:pause",
  downloadsResume: "downloads:resume",
  downloadsRemove: "downloads:remove",
  downloadsRetry: "downloads:retry",
  downloadsClearAll: "downloads:clear-all",
  downloadsClearCompleted: "downloads:clear-completed",
  downloadsRetryFailed: "downloads:retry-failed",
  downloadsRevealFile: "downloads:reveal-file",
  downloadsRevealFolder: "downloads:reveal-folder",
  downloadsGetSnapshot: "downloads:get-snapshot",
} as const;

export type IpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels];
