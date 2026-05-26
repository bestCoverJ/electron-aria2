export const ipcChannels = {
  settingsGet: "settings:get",
  settingsUpdate: "settings:update",
  runtimeGetStatus: "runtime:get-status",
  downloadsAdd: "downloads:add",
  downloadsPause: "downloads:pause",
  downloadsResume: "downloads:resume",
  downloadsRemove: "downloads:remove",
  downloadsRetry: "downloads:retry",
  downloadsRevealFile: "downloads:reveal-file",
  downloadsRevealFolder: "downloads:reveal-folder",
  downloadsGetSnapshot: "downloads:get-snapshot",
} as const;

export type IpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels];
