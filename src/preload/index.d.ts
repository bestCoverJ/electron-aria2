import { ElectronAPI } from '@electron-toolkit/preload'

interface DownloadOptions {
  dir?: string
  out?: string
  [key: string]: any
}

interface DownloadTask {
  gid: string
  status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed'
  totalLength: string
  completedLength: string
  downloadSpeed: string
  uploadSpeed?: string
  files: Array<{
    path: string
    length: string
    completedLength: string
  }>
  dir: string
  errorMessage?: string
}

interface DownloadAPI {
  // 下载管理
  addDownload: (url: string, options?: DownloadOptions) => Promise<{ success: boolean; gid?: string; error?: string }>
  addTorrent: (torrentData: Buffer, options?: DownloadOptions) => Promise<{ success: boolean; gid?: string; error?: string }>
  pauseDownload: (gid: string) => Promise<{ success: boolean; error?: string }>
  resumeDownload: (gid: string) => Promise<{ success: boolean; error?: string }>
  stopDownload: (gid: string) => Promise<{ success: boolean; error?: string }>
  removeDownload: (gid: string, deleteFiles?: boolean) => Promise<{ success: boolean; error?: string }>
  deleteDownloadPermanently: (gid: string) => Promise<{ success: boolean; error?: string }>
  getRemovedDownloads: () => Promise<DownloadTask[]>
  setDownloadPath: (path: string) => Promise<void>
  getLastDownloadPath: () => Promise<string>
  getDownloadStatus: (gid: string) => Promise<{ success: boolean; status?: DownloadTask; error?: string }>
  getAllDownloads: () => Promise<{ success: boolean; downloads?: DownloadTask[]; error?: string }>

  // 文件对话框
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  showFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>

  // 文件操作
  selectFile: (gid: string) => Promise<void>
  openFile: (gid: string) => Promise<void>
  openFolder: (gid: string) => Promise<void>

  // 窗口控制
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>

  // 事件监听
  onDownloadStarted: (callback: (gid: string) => void) => void
  onDownloadCompleted: (callback: (gid: string) => void) => void
  onDownloadError: (callback: (gid: string) => void) => void
  onDownloadPaused: (callback: (gid: string) => void) => void
  onDownloadStopped: (callback: (gid: string) => void) => void
  onDownloadsUpdated: (callback: (downloads: DownloadTask[]) => void) => void
  onAddDownloadFromLink: (callback: (url: string) => void) => void

  // coverx链接处理
  createCoverxLink: (originalUrl: string) => Promise<{ success: boolean; coverxLink?: string; error?: string }>
  parseCoverxLink: (coverxUrl: string) => Promise<{ success: boolean; originalUrl?: string; error?: string }>

  // 移除监听器
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    downloadAPI: DownloadAPI
  }
}
