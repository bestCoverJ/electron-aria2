export type ThemePreference = "system" | "light" | "dark";

export type ShutdownBehavior = "ask" | "minimize-to-tray" | "quit";

export type RuntimeAvailability = "starting" | "ready" | "unavailable";

export type ApplicationUpdatePhase =
  | "disabled"
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface ApplicationUpdateSnapshot {
  currentVersion: string;
  phase: ApplicationUpdatePhase;
  availableVersion: string | null;
  downloadPercent: number | null;
  transferredBytes: number | null;
  totalBytes: number | null;
  errorMessage: string | null;
}

export type DownloadSourceKind =
  | "http"
  | "ftp"
  | "magnet"
  | "torrent"
  | "metalink"
  | "thunder"
  | "flashget"
  | "qqdl";

export type DownloadTaskState =
  | "queued"
  | "active"
  | "paused"
  | "completed"
  | "failed"
  | "removed"
  | "seeding";

export interface AppSettings {
  downloadDirectory: string;
  recentDownloadDirectories: string[];
  maxConcurrentDownloads: number;
  connectionsPerTask: number;
  globalDownloadLimit: number | null;
  globalUploadLimit: number | null;
  proxyUrl: string | null;
  theme: ThemePreference;
  shutdownBehavior: ShutdownBehavior;
  advancedAria2Options: Record<string, string>;
}

export interface DownloadTaskMetadata {
  gid: string;
  source: string;
  displayName: string | null;
  directory: string | null;
  logLines: string[];
  userNote: string | null;
  removeFilesOnDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeStatus {
  availability: RuntimeAvailability;
  message: string | null;
  pid: number | null;
  rpcPort: number | null;
  startedAt: string | null;
}

export interface DownloadTaskFile {
  index: number;
  path: string;
  length: number;
  completedLength: number;
  selected: boolean;
}

export interface DownloadTask {
  gid: string;
  source: string;
  directory: string | null;
  name: string;
  state: DownloadTaskState;
  progress: number;
  totalLength: number | null;
  completedLength: number;
  downloadSpeed: number;
  uploadSpeed: number;
  connections: number;
  remainingSeconds: number | null;
  files: DownloadTaskFile[];
  errorMessage: string | null;
  logLines: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TransferSummary {
  activeCount: number;
  queuedCount: number;
  completedCount: number;
  failedCount: number;
  downloadSpeed: number;
  uploadSpeed: number;
}

export interface TaskSnapshot {
  tasks: DownloadTask[];
  summary: TransferSummary;
  runtime: RuntimeStatus;
  capturedAt: string;
}

export interface AddDownloadInput {
  source: string;
  directory?: string;
  fileName?: string;
}

export interface AddDownloadBatchInput {
  sources: string[];
  directory?: string;
}

export type AddDownloadBatchItemStatus = "created" | "failed" | "skipped";

export interface AddDownloadBatchItemResult {
  source: string;
  status: AddDownloadBatchItemStatus;
  gid?: string;
  error?: string;
}

export interface AddDownloadBatchResult {
  items: AddDownloadBatchItemResult[];
  createdCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface RemoveDownloadOptions {
  removeFiles?: boolean;
}

export interface SelectDirectoryOptions {
  defaultPath?: string;
}

export interface SelectDirectoryResult {
  canceled: boolean;
  path: string | null;
}

export interface SelectTaskFileResult {
  canceled: boolean;
  path: string | null;
}

export interface SelectTaskFilesResult {
  canceled: boolean;
  paths: string[];
}

export interface TideApi {
  appWindow: {
    enterCompactMode(): Promise<void>;
    exitCompactMode(): Promise<void>;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(patch: Partial<AppSettings>): Promise<AppSettings>;
    selectDirectory(
      options?: SelectDirectoryOptions,
    ): Promise<SelectDirectoryResult>;
  };
  runtime: {
    getStatus(): Promise<RuntimeStatus>;
  };
  updates: {
    getSnapshot(): Promise<ApplicationUpdateSnapshot>;
    check(): Promise<ApplicationUpdateSnapshot>;
    download(): Promise<ApplicationUpdateSnapshot>;
    install(): Promise<void>;
    onStatusChanged(
      listener: (snapshot: ApplicationUpdateSnapshot) => void,
    ): () => void;
  };
  downloads: {
    selectTaskFile(): Promise<SelectTaskFileResult>;
    selectTaskFiles(): Promise<SelectTaskFilesResult>;
    add(input: AddDownloadInput): Promise<{ gid: string }>;
    addBatch(input: AddDownloadBatchInput): Promise<AddDownloadBatchResult>;
    pause(gid: string): Promise<void>;
    resume(gid: string): Promise<void>;
    remove(gid: string, options?: RemoveDownloadOptions): Promise<void>;
    retry(gid: string): Promise<{ gid: string }>;
    clearAll(): Promise<void>;
    clearCompleted(): Promise<void>;
    retryFailed(): Promise<void>;
    revealFile(gid: string): Promise<void>;
    revealFolder(gid: string): Promise<void>;
    getSnapshot(): Promise<TaskSnapshot>;
  };
}
