import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 下载API
const downloadAPI = {
  // 下载管理
  addDownload: (url: string, options?: any) => ipcRenderer.invoke('add-download', url, options),
  addTorrent: (torrentData: Buffer, options?: any) => ipcRenderer.invoke('add-torrent', torrentData, options),
  pauseDownload: (gid: string) => ipcRenderer.invoke('pause-download', gid),
  resumeDownload: (gid: string) => ipcRenderer.invoke('resume-download', gid),
  stopDownload: (gid: string) => ipcRenderer.invoke('stop-download', gid),
  removeDownload: (gid: string, deleteFiles?: boolean) => ipcRenderer.invoke('remove-download', gid, deleteFiles),
  deleteDownloadPermanently: (gid: string) => ipcRenderer.invoke('delete-download-permanently', gid),
  getRemovedDownloads: () => ipcRenderer.invoke('get-removed-downloads'),
  setDownloadPath: (path: string) => ipcRenderer.invoke('set-download-path', path),
  getLastDownloadPath: () => ipcRenderer.invoke('get-last-download-path'),
  getDownloadStatus: (gid: string) => ipcRenderer.invoke('get-download-status', gid),
  getAllDownloads: () => ipcRenderer.invoke('get-all-downloads'),

  // 文件对话框
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog'),

  // 窗口控制
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // 事件监听
  onDownloadStarted: (callback: (gid: string) => void) => {
    ipcRenderer.on('download-started', (_, gid) => callback(gid))
  },
  onDownloadCompleted: (callback: (gid: string) => void) => {
    ipcRenderer.on('download-completed', (_, gid) => callback(gid))
  },
  onDownloadError: (callback: (gid: string) => void) => {
    ipcRenderer.on('download-error', (_, gid) => callback(gid))
  },
  onDownloadPaused: (callback: (gid: string) => void) => {
    ipcRenderer.on('download-paused', (_, gid) => callback(gid))
  },
  onDownloadStopped: (callback: (gid: string) => void) => {
    ipcRenderer.on('download-stopped', (_, gid) => callback(gid))
  },
  onDownloadsUpdated: (callback: (downloads: any[]) => void) => {
    ipcRenderer.on('downloads-updated', (_, downloads) => callback(downloads))
  },
  onAddDownloadFromLink: (callback: (url: string) => void) => {
    ipcRenderer.on('add-download-from-link', (_, url) => callback(url))
  },

  // coverx链接处理
  createCoverxLink: (originalUrl: string) => ipcRenderer.invoke('create-coverx-link', originalUrl),
  parseCoverxLink: (coverxUrl: string) => ipcRenderer.invoke('parse-coverx-link', coverxUrl),

  // 移除监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('downloadAPI', downloadAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.downloadAPI = downloadAPI
}
