import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  Notification,
  dialog,
  nativeTheme
} from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'
import { aria2, createHTTP, open, close, type Conn } from 'maria2'
import * as crypto from 'crypto'
import micaElectron from 'mica-electron'
import icon from '../../resources/icon.png?asset'

const { MicaBrowserWindow, IS_WINDOWS_11, WIN10 } = micaElectron

interface DownloadTask {
  gid: string
  status: string
  totalLength: string
  completedLength: string
  downloadSpeed: string
  files: Array<{
    path: string
    length: string
    completedLength: string
  }>
  dir: string
  errorMessage?: string
}

class DownloadManager {
  private aria2Process: ChildProcess | null = null
  private aria2Connection: any = null
  private aria2Conn: Conn | null = null
  private mainWindow: InstanceType<typeof MicaBrowserWindow> | null = null
  private tray: Tray | null = null
  private isQuitting = false
  private aria2Port = 6800
  private aria2Secret = 'electron-aria2'
  private lastDownloadPath = '' // 记住上次下载路径
  private removedDownloads: DownloadTask[] = [] // 存储已删除的下载任务
  private downloadsDataPath = join(app.getPath('userData'), 'downloads.json') // 下载列表保存路径

  constructor() {
    this.setupApp()
    this.loadPersistedDownloads()
  }

  // AES加密解密函数
  private encryptAES(text: string, key: string = 'coverx'): string {
    const algorithm = 'aes-256-cbc'
    const keyHash = crypto.createHash('sha256').update(key).digest()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, keyHash, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  }

  private decryptAES(encryptedText: string, key: string = 'coverx'): string {
    try {
      // 尝试新格式 (iv:encrypted)
      if (encryptedText.includes(':')) {
        const algorithm = 'aes-256-cbc'
        const keyHash = crypto.createHash('sha256').update(key).digest()
        const parts = encryptedText.split(':')
        const iv = Buffer.from(parts[0], 'hex')
        const encrypted = parts[1]
        const decipher = crypto.createDecipheriv(algorithm, keyHash, iv)
        let decrypted = decipher.update(encrypted, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return decrypted
      } else {
        // 兼容旧格式 (直接base64)
        try {
          const buffer = Buffer.from(encryptedText, 'base64')
          const algorithm = 'aes-256-cbc'
          const keyBuffer = Buffer.from(key.padEnd(32, '0').substring(0, 32))
          const iv = buffer.slice(0, 16)
          const encrypted = buffer.slice(16)
          const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv)
          let decrypted = decipher.update(encrypted, undefined, 'utf8')
          decrypted += decipher.final('utf8')
          return decrypted
        } catch {
          // 如果都失败，返回原文本
          return encryptedText
        }
      }
    } catch (error) {
      console.error('解密失败:', error)
      throw error
    }
  }

  // 持久化相关方法
  private loadPersistedDownloads(): void {
    try {
      if (existsSync(this.downloadsDataPath)) {
        const data = readFileSync(this.downloadsDataPath, 'utf8')
        const parsed = JSON.parse(data)
        this.removedDownloads = parsed.removedDownloads || []
      }
    } catch (error) {
      console.error('加载持久化下载数据失败:', error)
    }
  }

  private savePersistedDownloads(): void {
    try {
      const data = {
        removedDownloads: this.removedDownloads,
        lastDownloadPath: this.lastDownloadPath
      }
      writeFileSync(this.downloadsDataPath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('保存持久化下载数据失败:', error)
    }
  }

  private setupApp(): void {
    // 设置深度链接协议
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('coverx', process.execPath, [join(__dirname, '../..')])
      }
    } else {
      app.setAsDefaultProtocolClient('coverx')
    }

    // 处理深度链接
    app.on('open-url', (event, url) => {
      event.preventDefault()
      this.handleDeepLink(url)
    })

    // Windows 处理深度链接
    app.on('second-instance', (event, commandLine) => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore()
        this.mainWindow.focus()
      }

      const url = commandLine.find((arg) => arg.startsWith('coverx://'))
      if (url) {
        this.handleDeepLink(url)
      }
    })
  }

  private handleDeepLink(url: string): void {
    console.log('处理深链接:', url)
    const urlObj = new URL(url)
    if (urlObj.protocol === 'coverx:' && urlObj.hostname === 'download') {
      const encryptedUrl = urlObj.searchParams.get('url')
      if (encryptedUrl && this.mainWindow) {
        try {
          console.log('尝试解密URL:', encryptedUrl)
          // 尝试解密URL
          const decryptedUrl = this.decryptAES(encryptedUrl)
          console.log('解密成功:', decryptedUrl)
          this.mainWindow.webContents.send('add-download-from-link', decryptedUrl)
        } catch (error) {
          console.error('解密URL失败:', error)
          // 如果解密失败，尝试直接使用原始URL（兼容性考虑）
          this.mainWindow.webContents.send('add-download-from-link', encryptedUrl)
        }
      }
    } else if (url.startsWith('coverx://')) {
      // 处理简化的coverx://链接格式
      const encryptedPart = url.replace('coverx://', '')
      if (encryptedPart && this.mainWindow) {
        try {
          console.log('尝试解密简化格式:', encryptedPart)
          const decryptedUrl = this.decryptAES(encryptedPart)
          console.log('解密成功:', decryptedUrl)
          this.mainWindow.webContents.send('add-download-from-link', decryptedUrl)
        } catch (error) {
          console.error('解密简化格式失败:', error)
        }
      }
    }
  }

  async startAria2(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 在开发模式和生产模式下使用不同的路径
      const aria2Path = is.dev
        ? join(__dirname, '../../src/main/lib/aria2-1.37.0/aria2c.exe')
        : join(__dirname, 'lib/aria2-1.37.0/aria2c.exe')

      const downloadDir = join(app.getPath('downloads'), 'aria2-downloads')

      // 确保下载目录存在
      if (!existsSync(downloadDir)) {
        mkdirSync(downloadDir, { recursive: true })
      }

      const args = [
        '--enable-rpc',
        '--rpc-listen-all=true',
        `--rpc-listen-port=${this.aria2Port}`,
        `--rpc-secret=${this.aria2Secret}`,
        '--rpc-allow-origin-all=true',
        `--dir=${downloadDir}`,
        '--continue=true',
        '--max-connection-per-server=16',
        '--min-split-size=1M',
        '--split=16',
        '--file-allocation=falloc',
        '--log-level=warn'
      ]

      this.aria2Process = spawn(aria2Path, args)

      this.aria2Process.on('error', (error) => {
        console.error('Aria2 启动失败:', error)
        reject(error)
      })

      // 等待aria2启动
      setTimeout(() => {
        this.connectToAria2()
          .then(() => resolve())
          .catch(reject)
      }, 3000) // 增加到3秒
    })
  }

  private async connectToAria2(): Promise<void> {
    // 创建HTTP连接到Aria2
    const rpcUrl = `http://localhost:${this.aria2Port}/jsonrpc` as const
    this.aria2Connection = createHTTP(rpcUrl, {
      secret: this.aria2Secret,
      timeout: 10000 // 增加到10秒
    })

    try {
      // 建立连接
      this.aria2Conn = await open(this.aria2Connection)

      // 测试连接
      const result = await aria2.getVersion(this.aria2Conn)
      console.log('Aria2连接成功', result)

      // 设置下载完成事件监听
      aria2.onDownloadComplete(this.aria2Conn, (params) => {
        this.showDownloadCompleteNotification(params[0].gid)
      })

      // 定期更新下载进度
      setInterval(() => {
        this.updateDownloadProgress()
      }, 1000)
    } catch (error) {
      console.error('连接Aria2详细错误:', error)
      throw new Error(`连接Aria2失败: ${error}`)
    }
  }

  private async updateDownloadProgress(): Promise<void> {
    if (!this.aria2Conn) return

    try {
      const activeDownloads = await aria2.tellActive(this.aria2Conn)
      const waitingDownloads = await aria2.tellWaiting(this.aria2Conn, 0, 100)
      const stoppedDownloads = await aria2.tellStopped(this.aria2Conn, 0, 100)

      const allDownloads = [...activeDownloads, ...waitingDownloads, ...stoppedDownloads]

      // 更新任务栏进度
      this.updateTaskbarProgress(activeDownloads)

      // 发送到渲染进程
      this.sendToRenderer('downloads-updated', allDownloads)
    } catch (error) {
      console.error('获取下载进度失败:', error)
    }
  }

  private updateTaskbarProgress(activeDownloads: DownloadTask[]): void {
    if (!this.mainWindow || activeDownloads.length === 0) {
      this.mainWindow?.setProgressBar(-1)
      return
    }

    let totalLength = 0
    let completedLength = 0

    activeDownloads.forEach((download) => {
      totalLength += parseInt(download.totalLength || '0')
      completedLength += parseInt(download.completedLength || '0')
    })

    if (totalLength > 0) {
      const progress = completedLength / totalLength
      this.mainWindow.setProgressBar(progress)
    }
  }

  // 自动提取文件名逻辑
  private extractFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const filename = pathname.split('/').pop()

      if (filename && filename.includes('.')) {
        // 去除查询参数等
        return filename.split('?')[0].split('#')[0]
      }
    } catch {
      // URL解析失败，忽略
    }

    return '' // 让 aria2 自动处理
  }

  private async showDownloadCompleteNotification(gid: string): Promise<void> {
    if (!this.aria2Conn) return

    try {
      const download = await aria2.tellStatus(this.aria2Conn, gid)
      const fileName = download.files?.[0]?.path
        ? download.files[0].path.split('/').pop() || '未知文件'
        : '未知文件'

      // 系统级通知
      const notification = new Notification({
        title: '下载完成',
        body: `${fileName} 下载完成`,
        icon: icon,
        silent: false
      })

      notification.show()

      // 点击通知打开文件所在目录
      notification.on('click', () => {
        if (download.files?.[0]?.path) {
          shell.showItemInFolder(download.files[0].path)
        }
      })
    } catch (error) {
      console.error('获取下载信息失败:', error)
    }
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  createWindow(): void {
    // 创建浏览器窗口
    // 判断系统主题
    let isDark = nativeTheme.shouldUseDarkColors
    const getTitleBarOverlay = (): { color: string; symbolColor: string; height: number } => ({
      color: isDark ? 'rgba(31,41,55,0.85)' : 'rgba(243,246,251,0.85)',
      symbolColor: isDark ? '#ffffff' : '#222222',
      height: 30
    })
    this.mainWindow = new MicaBrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      autoHideMenuBar: true,
      show: false,
      frame: false, // 无边框窗口
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        ...getTitleBarOverlay(),
        height: 40
      },
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    if (IS_WINDOWS_11) {
      this.mainWindow.setAutoTheme()
      this.mainWindow.setMicaTabbedEffect()
    } else if (WIN10) {
      this.mainWindow.setAcrylic()
    }

    // 监听主题变化，动态切换标题栏颜色和Mica效果
    const updateTheme = (): void => {
      isDark = nativeTheme.shouldUseDarkColors
      this.mainWindow?.setTitleBarOverlay({
        ...getTitleBarOverlay(),
        height: 40
      })
      this.mainWindow?.webContents.send('theme-changed', isDark ? 'dark' : 'light')
    }
    updateTheme()
    nativeTheme.on('updated', updateTheme)

    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show()
    })

    // 处理窗口关闭
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault()
        this.mainWindow?.hide()
      }
    })

    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // 加载页面
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // 创建系统托盘
    this.createTray()
  }

  private createTray(): void {
    this.tray = new Tray(icon)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          this.mainWindow?.show()
        }
      },
      {
        label: '退出',
        click: () => {
          this.isQuitting = true
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
    this.tray.setToolTip('Electron Aria2 下载器')

    this.tray.on('double-click', () => {
      this.mainWindow?.show()
    })
  }

  setupIPC(): void {
    // 添加下载任务
    ipcMain.handle('add-download', async (_, url: string, options?: Record<string, unknown>) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        // 检查是否已存在相同URL的下载任务
        const activeDownloads = await aria2.tellActive(this.aria2Conn)
        const waitingDownloads = await aria2.tellWaiting(this.aria2Conn, 0, 100)
        const allRunningDownloads = [...activeDownloads, ...waitingDownloads]

        const duplicateDownload = allRunningDownloads.find((download) => {
          return (
            download.files &&
            download.files.some((file) => file.uris && file.uris.some((uri) => uri.uri === url))
          )
        })

        if (duplicateDownload) {
          // 询问用户是否继续添加重复任务
          const response = await dialog.showMessageBox(this.mainWindow!, {
            type: 'question',
            buttons: ['取消', '继续添加'],
            defaultId: 0,
            message: '重复下载',
            detail: '该下载任务已存在，是否仍要继续添加？'
          })

          if (response.response === 0) {
            return { success: false, error: '用户取消添加重复任务' }
          }
        }

        console.log('添加下载任务:', { url, options })
        const gid = await aria2.addUri(this.aria2Conn, [url], options || {})
        return { success: true, gid }
      } catch (error) {
        console.error('添加下载失败:', error)
        return { success: false, error: String(error) }
      }
    })

    // 添加种子下载
    ipcMain.handle(
      'add-torrent',
      async (_, torrentData: Buffer, options?: Record<string, unknown>) => {
        if (!this.aria2Conn) throw new Error('Aria2 未连接')

        try {
          const torrentBase64 = torrentData.toString('base64')
          const gid = await aria2.addTorrent(this.aria2Conn, torrentBase64, [], options || {})
          return { success: true, gid }
        } catch (error) {
          return { success: false, error: String(error) }
        }
      }
    )

    // 暂停下载
    ipcMain.handle('pause-download', async (_, gid: string) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        await aria2.pause(this.aria2Conn, gid)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // 恢复下载
    ipcMain.handle('resume-download', async (_, gid: string) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        await aria2.unpause(this.aria2Conn, gid)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // 停止下载
    ipcMain.handle('stop-download', async (_, gid: string) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        await aria2.remove(this.aria2Conn, gid)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // 删除下载任务（移到回收站）
    ipcMain.handle('remove-download', async (_, gid: string, deleteFiles: boolean = false) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        const download = await aria2.tellStatus(this.aria2Conn, gid)

        // 如果任务正在运行，先停止它
        if (download.status === 'active' || download.status === 'waiting' || download.status === 'paused') {
          try {
            await aria2.remove(this.aria2Conn, gid)
          } catch (stopError) {
            console.log('停止下载失败，继续删除操作:', stopError)
          }
        }

        // 添加到已删除列表
        this.removedDownloads.push({
          ...download,
          status: 'removed'
        })

        // 保存到持久化存储
        this.savePersistedDownloads()

        // 从下载结果中移除
        try {
          await aria2.removeDownloadResult(this.aria2Conn, gid)
        } catch (removeError) {
          console.log('从结果中移除失败，可能任务还在运行:', removeError)
        }

        if (deleteFiles && download.files) {
          for (const file of download.files) {
            if (existsSync(file.path)) {
              shell.trashItem(file.path)
            }
          }
        }

        return { success: true }
      } catch (error) {
        console.error('删除下载失败:', error)
        return { success: false, error: `删除失败: ${error instanceof Error ? error.message : String(error)}` }
      }
    })

    // 彻底删除下载任务
    ipcMain.handle('delete-download-permanently', async (_, gid: string) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        const download = await aria2.tellStatus(this.aria2Conn, gid)
        await aria2.removeDownloadResult(this.aria2Conn, gid)

        if (download.files) {
          for (const file of download.files) {
            if (existsSync(file.path)) {
              rmSync(file.path, { force: true })
            }
          }
        }

        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // 获取下载状态
    ipcMain.handle('get-download-status', async (_, gid: string) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        const status = await aria2.tellStatus(this.aria2Conn, gid)
        return { success: true, status }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // 获取所有下载任务
    ipcMain.handle('get-all-downloads', async () => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        const activeDownloads = await aria2.tellActive(this.aria2Conn)
        const waitingDownloads = await aria2.tellWaiting(this.aria2Conn, 0, 100)
        const stoppedDownloads = await aria2.tellStopped(this.aria2Conn, 0, 100)

        return {
          success: true,
          downloads: [...activeDownloads, ...waitingDownloads, ...stoppedDownloads],
          removedDownloads: this.removedDownloads
        }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // 获取已删除的下载任务
    ipcMain.handle('get-removed-downloads', async () => {
      return { success: true, removedDownloads: this.removedDownloads }
    })

    // 获取上次下载路径
    ipcMain.handle('get-last-download-path', async () => {
      return this.lastDownloadPath || join(app.getPath('downloads'), 'aria2-downloads')
    })

    // 设置下载路径
    ipcMain.handle('set-download-path', async (_, path: string) => {
      this.lastDownloadPath = path
      return { success: true }
    })

    // 选择文件对话框（仅种子文件）
    ipcMain.handle('show-open-dialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile'],
        filters: [{ name: '种子文件', extensions: ['torrent'] }]
      })
      return result
    })

    // 选择文件夹对话框
    ipcMain.handle('show-folder-dialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      })
      return result
    })

    // 文件操作
    ipcMain.handle('select-file', async (_, gid: string) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        const download = await aria2.tellStatus(this.aria2Conn, gid)
        if (download.files && download.files.length > 0 && existsSync(download.files[0].path)) {
          shell.showItemInFolder(download.files[0].path)
        }
      } catch (error) {
        console.error('选择文件失败:', error)
      }
    })

    ipcMain.handle('open-file', async (_, gid: string) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        const download = await aria2.tellStatus(this.aria2Conn, gid)
        if (download.files && download.files.length > 0 && existsSync(download.files[0].path)) {
          shell.openPath(download.files[0].path)
        }
      } catch (error) {
        console.error('打开文件失败:', error)
      }
    })

    ipcMain.handle('open-folder', async (_, gid: string) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        const download = await aria2.tellStatus(this.aria2Conn, gid)
        if (download.files && download.files.length > 0) {
          const folderPath = download.files[0].path.substring(0, download.files[0].path.lastIndexOf('\\'))
          if (existsSync(folderPath)) {
            shell.openPath(folderPath)
          }
        }
      } catch (error) {
        console.error('打开文件夹失败:', error)
      }
    })

        // 窗口控制
    ipcMain.handle('minimize-window', () => {
      this.mainWindow?.minimize()
    })

    ipcMain.handle('maximize-window', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize()
      } else {
        this.mainWindow?.maximize()
      }
    })

    ipcMain.handle('close-window', () => {
      this.mainWindow?.close()
    })

    // 创建coverx://链接
    ipcMain.handle('create-coverx-link', async (_, originalUrl: string) => {
      try {
        // 提取URL的主要部分（去掉协议）
        const urlWithoutProtocol = originalUrl.replace(/^https?:\/\//, '')
        const encryptedUrl = this.encryptAES(urlWithoutProtocol)
        return { success: true, coverxLink: `coverx://${encryptedUrl}` }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // 解析coverx://链接
    ipcMain.handle('parse-coverx-link', async (_, coverxUrl: string) => {
      try {
        if (coverxUrl.startsWith('coverx://')) {
          const encryptedPart = coverxUrl.replace('coverx://', '')
          const decryptedUrl = this.decryptAES(encryptedPart)
          // 添加回协议前缀
          const fullUrl = decryptedUrl.startsWith('http') ? decryptedUrl : `https://${decryptedUrl}`
          return { success: true, originalUrl: fullUrl }
        }
        return { success: false, error: '不是有效的coverx链接' }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })
  }

  async initialize(): Promise<void> {
    await this.startAria2()
    this.setupIPC()
    this.createWindow()
  }

  cleanup(): void {
    if (this.aria2Process) {
      this.aria2Process.kill()
    }
    if (this.aria2Conn) {
      close(this.aria2Conn)
    }
  }
}

const downloadManager = new DownloadManager()

// 防止多实例
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.electron.aria2')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    await downloadManager.initialize()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        downloadManager.createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    downloadManager.cleanup()
  })
}
