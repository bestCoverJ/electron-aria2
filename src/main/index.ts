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
import { join, dirname } from 'path'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'
import { aria2, createHTTP, open, close, type Conn } from 'maria2'
import * as crypto from 'crypto'
import micaElectron from 'mica-electron'
import icon from '../../resources/icon.png?asset'

const { MicaBrowserWindow, IS_WINDOWS_11, WIN10 } = micaElectron

// JSON5 读写（若 json5 依赖不可用则回退到 JSON）
let JSON5: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  JSON5 = require('json5')
} catch {}

function readJson5File(filePath: string): unknown {
  try {
    if (!existsSync(filePath)) return {}
    const raw = readFileSync(filePath, 'utf8')
    if (JSON5) return JSON5.parse(raw)
    const withoutComments = raw
      .split(/\r?\n/)
      .filter((l) => !/^\s*\/.*/.test(l))
      .join('\n')
    return JSON.parse(withoutComments)
  } catch {
    return {}
  }
}

function writeJson5File(filePath: string, data: unknown): void {
  try {
    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const content = JSON5 ? JSON5.stringify(data, null, 2) : JSON.stringify(data, null, 2)
    writeFileSync(filePath, String(content))
  } catch {}
}

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
  private aria2Host = '127.0.0.1'
  private aria2Secret = 'electron-aria2'
  private lastDownloadPath = '' // 记住上次下载路径
  private removedDownloads: DownloadTask[] = [] // 存储已删除的下载任务
  private downloadsDataPath = join(app.getPath('userData'), 'downloads.json') // 下载列表保存路径
  private recentUrl: { value: string; ts: number } | null = null // 短时去重
  private taskStats: Record<string, { startedAt: number; maxSpeed: number; sourceUrl?: string }> = {}
  private statsByKey: Record<string, { startedAt: number; maxSpeed: number; sourceUrl?: string }> = {}
  private gidToKey: Record<string, string> = {}
  private downloadLimit: string = '0' // B/s，'0' 表示不限速
  private themeSource: 'system' | 'light' | 'dark' = 'system'
  private saveTimer: NodeJS.Timeout | null = null
  private aria2SessionPath = join(app.getPath('userData'), 'aria2.session')
  private progressTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private engineMode: 'internal' | 'external' = 'internal'
  private customAria2Path: string | null = null
  // 持久化历史（JSON5）
  private historyPath = join(app.getPath('userData'), 'history.json5')
  private historyByKey: Record<string, any> = {}

  constructor() {
    this.setupApp()
    this.loadPersistedDownloads()
    this.loadHistory()
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
        this.lastDownloadPath = parsed.lastDownloadPath || this.lastDownloadPath
        this.downloadLimit = parsed.settings?.downloadLimit ?? this.downloadLimit
        this.themeSource = parsed.settings?.theme ?? this.themeSource
        // 引擎配置
        this.engineMode = parsed.settings?.engineMode ?? this.engineMode
        this.customAria2Path = parsed.settings?.aria2Path ?? null
        this.aria2Host = parsed.settings?.rpcHost ?? this.aria2Host
        this.aria2Port = parsed.settings?.rpcPort ?? this.aria2Port
        this.aria2Secret = parsed.settings?.rpcSecret ?? this.aria2Secret
        this.statsByKey = parsed.statsByKey || {}
        // 应用主题
        nativeTheme.themeSource = this.themeSource
      }
    } catch (error) {
      console.error('加载持久化下载数据失败:', error)
    }
  }

  private savePersistedDownloads(): void {
    try {
      const data = {
        removedDownloads: this.removedDownloads,
        lastDownloadPath: this.lastDownloadPath,
        settings: {
          theme: this.themeSource,
          downloadLimit: this.downloadLimit,
          engineMode: this.engineMode,
          aria2Path: this.customAria2Path,
          rpcHost: this.aria2Host,
          rpcPort: this.aria2Port,
          rpcSecret: this.aria2Secret
        },
        statsByKey: this.statsByKey
      }
      writeFileSync(this.downloadsDataPath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('保存持久化下载数据失败:', error)
    }
  }

  private loadHistory(): void {
    try {
      if (existsSync(this.historyPath)) {
        const data: any = readJson5File(this.historyPath)
        this.historyByKey = (data && data.historyByKey) ? data.historyByKey : {}
      }
    } catch (e) {
      console.error('加载历史文件失败:', e)
    }
  }

  private saveHistory(): void {
    try {
      writeJson5File(this.historyPath, { historyByKey: this.historyByKey })
    } catch (e) {
      console.error('保存历史文件失败:', e)
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
  app.on('second-instance', (_event, commandLine) => {
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
      const defaultDevPath = join(process.cwd(), 'src', 'main', 'lib', 'aria2-1.37.0', 'aria2c.exe')
      const defaultProdPath = join(process.resourcesPath, 'lib', 'aria2-1.37.0', 'aria2c.exe')
      const aria2Path = this.engineMode === 'internal'
        ? (this.customAria2Path || (is.dev ? defaultDevPath : defaultProdPath))
        : ''

      const downloadDir = join(app.getPath('downloads'), 'aria2-downloads')

      // 确保下载目录存在
      if (!existsSync(downloadDir)) {
        mkdirSync(downloadDir, { recursive: true })
      }

      // 修复：aria2.session 文件不存在时自动创建，避免 aria2c.exe 直接退出
      if (!existsSync(this.aria2SessionPath)) {
        try {
          writeFileSync(this.aria2SessionPath, '')
        } catch (e) {
          console.warn('自动创建 aria2.session 文件失败:', e)
        }
      }

      const args = [
        '--enable-rpc',
        '--rpc-listen-all=true',
        `--rpc-listen-port=${this.aria2Port}`,
        `--rpc-secret=${this.aria2Secret}`,
        '--rpc-allow-origin-all=true',
        `--dir=${downloadDir}`,
        '--continue=true',
        `--save-session=${this.aria2SessionPath}`,
        `--input-file=${this.aria2SessionPath}`,
        '--save-session-interval=10',
        '--max-connection-per-server=16',
        '--min-split-size=1M',
        '--split=16',
        '--file-allocation=falloc',
        '--log-level=warn'
      ]

      if (this.engineMode === 'internal' && (!aria2Path || !existsSync(aria2Path))) {
        console.warn('未找到内置 aria2 可执行文件:', aria2Path)
        this.sendToRenderer('aria2-status', { connected: false, reason: 'missing-binary', path: aria2Path })
        // 不启动本地进程，直接尝试连接本机已有的 aria2 服务（若用户已自行启动）
        this.scheduleReconnect()
        return resolve()
      }

      if (this.engineMode === 'internal') {
        this.aria2Process = spawn(aria2Path, args)
        this.aria2Process.on('error', (error) => {
          console.error('Aria2 启动失败:', error)
          this.sendToRenderer('aria2-status', { connected: false, reason: 'spawn-error', error: String(error) })
          reject(error)
        })
        this.aria2Process.stderr?.on('data', (d) => {
          console.error('aria2 stderr:', d.toString())
        })
        this.aria2Process.stdout?.on('data', (d) => {
          console.log('aria2 stdout:', d.toString())
        })
        this.aria2Process.on('exit', (code, signal) => {
          console.warn('aria2 进程退出:', { code, signal })
          this.sendToRenderer('aria2-status', { connected: false, reason: 'spawn-exit', code, signal })
        })
      } else {
        // 外部模式不启动子进程
        console.log('使用外部 Aria2 服务，不启动本地进程')
      }

      // 等待aria2启动后尝试连接；连接失败则后台重试但不阻塞窗口创建
      setTimeout(() => {
        this.connectToAria2()
          .then(() => resolve())
          .catch((err) => {
            console.error('首次连接 Aria2 失败，将后台重试:', err)
            this.scheduleReconnect()
            resolve()
          })
      }, 3000)
    })
  }

  private async connectToAria2(): Promise<void> {
    // 创建HTTP连接到Aria2
    const rpcUrl = `http://${this.aria2Host}:${this.aria2Port}/jsonrpc` as const
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
  this.sendToRenderer('aria2-status', { connected: true })

      // 设置下载完成事件监听
      aria2.onDownloadComplete(this.aria2Conn, (params) => {
        this.showDownloadCompleteNotification(params[0].gid)
      })

      // 定期更新下载进度（避免重复定时器）
      if (this.progressTimer) {
        clearInterval(this.progressTimer)
        this.progressTimer = null
      }
      this.progressTimer = setInterval(() => {
        this.updateDownloadProgress()
      }, 1000)

      // 应用全局限速（如果有设置）
      try {
        if (this.downloadLimit && this.downloadLimit !== '0') {
          await aria2.changeGlobalOption(this.aria2Conn, {
            'max-overall-download-limit': this.downloadLimit
          } as any)
        }
      } catch (e) {
        console.warn('设置全局限速失败:', e)
      }
      // 连接成功重置重试计数
      this.reconnectAttempts = 0
    } catch (error) {
      console.error('连接Aria2详细错误:', error)
      // 抛出由调用方决定是否重试
      throw new Error(`连接Aria2失败: ${error}`)
    }
  }

  private scheduleReconnect(): void {
    // 指数退避，最大 30s
    const delay = Math.min(30000, 2000 * Math.pow(1.5, this.reconnectAttempts))
    this.reconnectAttempts++
    this.sendToRenderer('aria2-status', { connected: false, reason: 'reconnecting', delay })
    setTimeout(async () => {
      try {
        await this.connectToAria2()
        console.log('Aria2 重新连接成功')
        this.sendToRenderer('aria2-status', { connected: true })
      } catch (e) {
        console.warn(`重试连接 Aria2 失败，将在 ${Math.round(delay / 1000)}s 后再次重试`, e)
        this.scheduleReconnect()
      }
    }, delay)
  }

  private async updateDownloadProgress(): Promise<void> {
    if (!this.aria2Conn) return

    try {
      const activeDownloads = await aria2.tellActive(this.aria2Conn)
      const waitingDownloads = await aria2.tellWaiting(this.aria2Conn, 0, 100)
      const stoppedDownloads = await aria2.tellStopped(this.aria2Conn, 0, 100)

      const allDownloads = [...activeDownloads, ...waitingDownloads, ...stoppedDownloads]

      // 更新统计信息（最高速度、开始时间）
      const now = Date.now()
      activeDownloads.forEach((d: any) => {
        const gid = d.gid
        if (!this.taskStats[gid]) {
          this.taskStats[gid] = { startedAt: now, maxSpeed: 0 }
        }
        const sp = parseInt(d.downloadSpeed || '0')
        if (sp > (this.taskStats[gid].maxSpeed || 0)) {
          this.taskStats[gid].maxSpeed = sp
        }

        // 持久化统计（按稳定 key）
        const key = this.computeTaskKeyFromStatus(d)
        if (key) {
          this.gidToKey[gid] = key
          const prev = this.statsByKey[key]
          const srcUrl = this.taskStats[gid].sourceUrl || d.files?.[0]?.uris?.[0]?.uri
          if (!prev) {
            this.statsByKey[key] = {
              startedAt: now,
              maxSpeed: this.taskStats[gid].maxSpeed || 0,
              sourceUrl: srcUrl
            }
          } else {
            if ((this.taskStats[gid].maxSpeed || 0) > (prev.maxSpeed || 0)) {
              prev.maxSpeed = this.taskStats[gid].maxSpeed || 0
            }
            if (!prev.sourceUrl && srcUrl) prev.sourceUrl = srcUrl
          }
        }
      })

      // 将统计信息附着到任务对象（不改变aria2原始字段）
      const enriched = allDownloads.map((d: any) => {
        const key = this.gidToKey[d.gid] || this.computeTaskKeyFromStatus(d) || undefined
        const statsForKey = key ? this.statsByKey[key] : undefined
        return {
          ...d,
          stats: this.taskStats[d.gid] || statsForKey || undefined
        }
      })

      // 更新任务栏进度
      this.updateTaskbarProgress(activeDownloads as any)

      // 更新历史（JSON5）：按稳定 key 覆盖保存最近状态
      try {
        enriched.forEach((d: any) => {
          const key = this.gidToKey[d.gid] || this.computeTaskKeyFromStatus(d)
          if (!key) return
          const filePath = d.files?.[0]?.path || ''
          const record = {
            key,
            gid: d.gid,
            status: d.status,
            totalLength: d.totalLength,
            completedLength: d.completedLength,
            downloadSpeed: d.downloadSpeed,
            files: d.files,
            dir: d.dir,
            errorMessage: d.errorMessage,
            stats: d.stats,
            lastUpdatedAt: Date.now(),
            fileName: filePath ? (filePath.split('/').pop() || filePath.split('\\').pop() || '') : ''
          }
          this.historyByKey[key] = record
        })
      } catch (e) {
        console.warn('更新历史失败:', e)
      }

      // 发送到渲染进程
      this.sendToRenderer('downloads-updated', enriched)

      // 定期保存
      if (!this.saveTimer) {
        this.saveTimer = setInterval(() => {
          this.savePersistedDownloads()
          this.saveHistory()
        }, 15000)
      }
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
  this.tray.setToolTip('Tide')

    this.tray.on('double-click', () => {
      this.mainWindow?.show()
    })
  }

  setupIPC(): void {
    // 添加下载任务
    ipcMain.handle('add-download', async (_, url: string, options?: Record<string, unknown>) => {
      if (!this.aria2Conn) throw new Error('Aria2 未连接')

      try {
        const normalizeUrl = (u: string): string => {
          try {
            if (u.startsWith('magnet:')) return u.trim()
            const parsed = new URL(u)
            // 统一大小写和去除末尾斜杠
            parsed.hostname = parsed.hostname.toLowerCase()
            // 排序查询参数，去除无意义的空参数
            const params = new URLSearchParams(parsed.search)
            const sorted = new URLSearchParams()
            Array.from(params.keys())
              .sort()
              .forEach((k) => {
                const v = params.get(k)
                if (v !== null && v !== '') sorted.append(k, v)
              })
            parsed.search = sorted.toString() ? `?${sorted.toString()}` : ''
            parsed.pathname = parsed.pathname.replace(/\\+/g, '/').replace(/\/+$/, '')
            return parsed.toString()
          } catch {
            return u.trim()
          }
        }

        const normalizedInput = normalizeUrl(url)
        const now = Date.now()
        if (this.recentUrl && this.recentUrl.value === normalizedInput && now - this.recentUrl.ts < 5000) {
          return { success: false, error: '短时间内重复添加相同链接，已忽略。' }
        }

        // 检查是否已存在相同URL的下载任务
        const activeDownloads = await aria2.tellActive(this.aria2Conn)
        const waitingDownloads = await aria2.tellWaiting(this.aria2Conn, 0, 100)
        const allRunningDownloads = [...activeDownloads, ...waitingDownloads]

        const duplicateDownload = allRunningDownloads.find((download) => {
          return (
            download.files &&
            download.files.some((file) =>
              file.uris && file.uris.some((uri) => normalizeUrl(uri.uri) === normalizedInput)
            )
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

  console.log('添加下载任务:', { url: normalizedInput, options })
  const gid = await aria2.addUri(this.aria2Conn, [normalizedInput], options || {})
  // 记录统计信息
  this.taskStats[gid] = { startedAt: Date.now(), maxSpeed: 0, sourceUrl: normalizedInput }
  const key = this.computeTaskKeyFromParams(normalizedInput, options)
  this.gidToKey[gid] = key
  if (!this.statsByKey[key]) {
    this.statsByKey[key] = { startedAt: Date.now(), maxSpeed: 0, sourceUrl: normalizedInput }
  }
        this.recentUrl = { value: normalizedInput, ts: now }
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
      try {
        if (!this.aria2Conn) {
          // 离线模式：返回历史记录（JSON5）
          const list = Object.values(this.historyByKey || {}) as any[]
          return { success: true, downloads: list, removedDownloads: this.removedDownloads }
        }
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
    // 选择可执行文件（如 aria2c.exe）
    ipcMain.handle('select-executable', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile'],
        filters: [
          { name: '可执行文件', extensions: process.platform === 'win32' ? ['exe'] : [''] }
        ]
      })
      return result
    })

    // 设置引擎配置
    ipcMain.handle('set-engine-config', async (_evt, cfg: {
      engineMode: 'internal' | 'external'
      aria2Path?: string | null
      rpcHost?: string
      rpcPort?: number
      rpcSecret?: string
    }) => {
      this.engineMode = cfg.engineMode
      this.customAria2Path = cfg.aria2Path ?? null
      if (cfg.rpcHost) this.aria2Host = cfg.rpcHost
      if (typeof cfg.rpcPort === 'number') this.aria2Port = cfg.rpcPort
      if (cfg.rpcSecret) this.aria2Secret = cfg.rpcSecret
      this.savePersistedDownloads()
      // 重新连接逻辑：
      try {
        if (this.aria2Process) {
          this.aria2Process.kill()
          this.aria2Process = null
        }
        if (this.aria2Conn) {
          await close(this.aria2Conn)
          this.aria2Conn = null
        }
      } catch {}
      await this.startAria2()
      return { success: true }
    })

    // 测试连接（不改变当前连接状态）
    ipcMain.handle('test-aria2-connection', async (_evt, params?: {
      engineMode?: 'internal' | 'external'
      aria2Path?: string
      rpcHost?: string
      rpcPort?: number
      rpcSecret?: string
    }) => {
      try {
        const host = params?.rpcHost ?? this.aria2Host
        const port = params?.rpcPort ?? this.aria2Port
        const secret = params?.rpcSecret ?? this.aria2Secret
        const url = `http://${host}:${port}/jsonrpc`
        const conn = await open(createHTTP(url as any, { secret, timeout: 5000 }))
        await aria2.getVersion(conn)
        await close(conn)
        return { success: true }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    })

    // 设置下载路径
    ipcMain.handle('set-download-path', async (_, path: string) => {
      this.lastDownloadPath = path
      this.savePersistedDownloads()
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
          const p = download.files[0].path
          // 兼容 Windows 反斜杠和正斜杠
          const normalized = require('path').normalize(p)
          const folderPath = require('path').dirname(normalized)
          if (existsSync(folderPath)) {
            shell.openPath(folderPath)
          } else if (existsSync(normalized)) {
            // 退化为展示文件位置
            shell.showItemInFolder(normalized)
          }
        }
      } catch (error) {
        console.error('打开文件夹失败:', error)
      }
    })

    // 设置主题（system/light/dark）
    ipcMain.handle('set-theme', async (_, theme: 'system' | 'light' | 'dark') => {
      try {
        this.themeSource = theme
        nativeTheme.themeSource = theme
        const isDark = nativeTheme.shouldUseDarkColors
        this.mainWindow?.setTitleBarOverlay({
          color: isDark ? 'rgba(31,41,55,0.85)' : 'rgba(243,246,251,0.85)',
          symbolColor: isDark ? '#ffffff' : '#222222',
          height: 40
        })
        this.mainWindow?.webContents.send('theme-changed', isDark ? 'dark' : 'light')
        this.savePersistedDownloads()
      } catch (e) {
        console.error('设置主题失败:', e)
      }
    })

    // 设置全局下载限速（B/s，字符串）
    ipcMain.handle('set-download-limit', async (_, limit: string) => {
      try {
        this.downloadLimit = limit || '0'
        if (this.aria2Conn) {
          await aria2.changeGlobalOption(this.aria2Conn, {
            'max-overall-download-limit': this.downloadLimit
          } as any)
        }
        this.savePersistedDownloads()
      } catch (e) {
        console.error('设置下载限速失败:', e)
      }
    })

    // 获取当前设置
    ipcMain.handle('get-settings', async () => {
      return {
        theme: (nativeTheme.themeSource as 'system' | 'light' | 'dark') ?? this.themeSource,
        downloadPath: this.lastDownloadPath || join(app.getPath('downloads'), 'aria2-downloads'),
        downloadLimit: this.downloadLimit,
        engineMode: this.engineMode,
        aria2Path: this.customAria2Path,
        rpcHost: this.aria2Host,
        rpcPort: this.aria2Port,
        rpcSecret: this.aria2Secret
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

  private computeTaskKeyFromParams(url: string, options?: Record<string, unknown>): string {
    const dir = (options?.dir as string) || ''
    const out = (options?.out as string) || ''
    return `${url}|${dir}|${out}`
  }

  private computeTaskKeyFromStatus(d: any): string | null {
    try {
      const bt = (d as any).bittorrent
      if (bt?.infoHash) {
        return `bt:${bt.infoHash}`
      }
      const url = d.files?.[0]?.uris?.[0]?.uri
      const dir = d.dir || ''
      const out = d.files?.[0]?.path ? (d.files[0].path.split('/').pop() || d.files[0].path.split('\\').pop() || '') : ''
      if (url) {
        return `${url}|${dir}|${out}`
      }
      return null
    } catch {
      return null
    }
  }

  async initialize(): Promise<void> {
    await this.startAria2()
    this.setupIPC()
    this.createWindow()
  }

  cleanup(): void {
    // 最后保存一次
    this.savePersistedDownloads()
    this.saveHistory()
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
      this.progressTimer = null
    }
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
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, _argv, _cwd) => {
    // 有新实例启动时，弹出已存在窗口
    const win = downloadManager['mainWindow']
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.electron.aria2')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    try {
      await downloadManager.initialize()
    } catch (e) {
      console.error('应用初始化时发生错误（不会阻止窗口创建）:', e)
      // 即便初始化失败，也确保窗口与IPC创建
      try {
        downloadManager['setupIPC']()
      } catch {}
      try {
        downloadManager.createWindow()
      } catch {}
    }

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

// 全局异常兜底，避免未处理拒绝导致进程异常
process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err)
})
