import React, { useState, useEffect, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DownloadItemNew from './components/DownloadItemNew'
import AddDownloadModal from './components/AddDownloadModal'
import CoverxGenerator from './components/CoverxGenerator'

interface DownloadTask {
  gid: string
  status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed'
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

function App(): React.JSX.Element {
  const [downloads, setDownloads] = useState<DownloadTask[]>([])
  const [removedDownloads, setRemovedDownloads] = useState<DownloadTask[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCoverxGeneratorOpen, setIsCoverxGeneratorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  const [lastClipboardCheck, setLastClipboardCheck] = useState('')

  useEffect(() => {
    // 主题切换监听
    const setBodyTheme = (t: 'dark' | 'light') => {
      setTheme(t)
      document.body.classList.remove('dark', 'light')
      document.body.classList.add(t)
    }
    setBodyTheme(theme)
    // 监听主进程推送的主题变化
    window.electron?.ipcRenderer?.on?.('theme-changed', (_: any, t: string) => {
      setBodyTheme(t as 'dark' | 'light')
    })
    // 监听系统主题变化（前端兜底）
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const mqListener = (e: MediaQueryListEvent) => setBodyTheme(e.matches ? 'dark' : 'light')
    mql.addEventListener('change', mqListener)

    // 调试：检查downloadAPI是否可用
    console.log('downloadAPI available:', !!window.downloadAPI)
    console.log(
      'downloadAPI methods:',
      window.downloadAPI ? Object.keys(window.downloadAPI) : 'N/A'
    )

    if (!window.downloadAPI) {
      console.error('downloadAPI not available - preload script not loaded correctly')
      return
    }

    // 初始化下载列表
    loadDownloads()
    loadRemovedDownloads()

    // 检查剪切板内容
    checkClipboardForDownloadLinks()

    // 监听下载事件
    window.downloadAPI.onDownloadsUpdated((updatedDownloads) => {
      setDownloads(updatedDownloads)
    })

    // 监听深度链接
    window.downloadAPI.onAddDownloadFromLink((url) => {
      handleAddDownload(url)
    })

    // 清理监听器
    return () => {
      window.downloadAPI.removeAllListeners('downloads-updated')
      window.downloadAPI.removeAllListeners('add-download-from-link')
      mql.removeEventListener('change', mqListener)
    }
  }, [])

  const loadDownloads = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const result = await window.downloadAPI.getAllDownloads()
      if (result.success && result.downloads) {
        setDownloads(result.downloads)
      }
    } catch (error) {
      console.error('加载下载列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRemovedDownloads = async (): Promise<void> => {
    try {
      const removedTasks = await window.downloadAPI.getRemovedDownloads()
      setRemovedDownloads(removedTasks || [])
    } catch (error) {
      console.error('加载已删除下载列表失败:', error)
    }
  }

  // 检查剪切板中的下载链接
  const checkClipboardForDownloadLinks = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && text !== lastClipboardCheck && isDownloadableUrl(text)) {
        setLastClipboardCheck(text)
        const shouldOpen = confirm(
          `检测到剪切板中有下载链接：\n${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n\n是否立即添加下载任务？`
        )
        if (shouldOpen) {
          handleAddDownload(text)
        }
      }
    } catch (error) {
      // 剪切板权限被拒绝或其他错误，静默处理
      console.log('无法读取剪切板内容')
    }
  }

  // 判断是否为可下载的URL
  const isDownloadableUrl = (text: string): boolean => {
    // 支持coverx://协议
    if (text.startsWith('coverx://')) {
      return true
    }

    try {
      const url = new URL(text)
      const pathname = url.pathname.toLowerCase()

      // 检查是否以文件扩展名结尾
      const fileExtensions = [
        '.zip',
        '.rar',
        '.7z',
        '.tar',
        '.gz',
        '.bz2',
        '.mp4',
        '.avi',
        '.mkv',
        '.mov',
        '.wmv',
        '.flv',
        '.mp3',
        '.wav',
        '.flac',
        '.aac',
        '.m4a',
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.bmp',
        '.svg',
        '.pdf',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.ppt',
        '.pptx',
        '.exe',
        '.msi',
        '.dmg',
        '.pkg',
        '.deb',
        '.rpm',
        '.iso',
        '.img',
        '.torrent'
      ]

      return fileExtensions.some((ext) => pathname.endsWith(ext)) || text.startsWith('magnet:')
    } catch {
      return text.startsWith('magnet:')
    }
  }

  // 判断下载源类型
  const getSourceType = (task: DownloadTask): 'normal' | 'torrent' | 'coverx' => {
    // 检查文件名是否为.torrent结尾
    const fileName = getFileName(task).toLowerCase()
    if (fileName.endsWith('.torrent')) {
      return 'torrent'
    }

    // 这里可以根据其他条件判断是否为coverx协议
    // 暂时都返回normal
    return 'normal'
  }

  const handleAddDownload = async (url: string, options?: any): Promise<void> => {
    try {
      const result = await window.downloadAPI.addDownload(url, options)
      if (result.success) {
        await loadDownloads()
      } else {
        alert(`添加下载失败: ${result.error}`)
      }
    } catch (error) {
      console.error('添加下载失败:', error)
      alert('添加下载失败')
    }
  }

  const handleAddTorrent = async (file: File, options?: any): Promise<void> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const result = await window.downloadAPI.addTorrent(buffer, options)
      if (result.success) {
        await loadDownloads()
      } else {
        alert(`添加种子失败: ${result.error}`)
      }
    } catch (error) {
      console.error('添加种子失败:', error)
      alert('添加种子失败')
    }
  }

  const handlePauseDownload = async (gid: string): Promise<void> => {
    try {
      const result = await window.downloadAPI.pauseDownload(gid)
      if (!result.success) {
        alert(`暂停下载失败: ${result.error}`)
      }
    } catch (error) {
      console.error('暂停下载失败:', error)
    }
  }

  const handleResumeDownload = async (gid: string): Promise<void> => {
    try {
      const result = await window.downloadAPI.resumeDownload(gid)
      if (!result.success) {
        alert(`恢复下载失败: ${result.error}`)
      }
    } catch (error) {
      console.error('恢复下载失败:', error)
    }
  }

  const handleStopDownload = async (gid: string): Promise<void> => {
    if (confirm('确定要停止这个下载任务吗？')) {
      try {
        const result = await window.downloadAPI.stopDownload(gid)
        if (!result.success) {
          alert(`停止下载失败: ${result.error}`)
        }
      } catch (error) {
        console.error('停止下载失败:', error)
      }
    }
  }

  const handleRemoveDownload = async (gid: string): Promise<void> => {
    if (confirm('确定要移除这个下载任务吗？文件将移动到回收站。')) {
      try {
        const result = await window.downloadAPI.removeDownload(gid, true)
        if (!result.success) {
          alert(`移除下载失败: ${result.error}`)
        }
      } catch (error) {
        console.error('移除下载失败:', error)
      }
    }
  }

  const handleDeleteDownload = async (gid: string): Promise<void> => {
    if (confirm('确定要彻底删除这个下载任务吗？文件将被永久删除，此操作不可恢复！')) {
      try {
        const result = await window.downloadAPI.deleteDownloadPermanently(gid)
        if (!result.success) {
          alert(`删除下载失败: ${result.error}`)
        }
      } catch (error) {
        console.error('删除下载失败:', error)
      }
    }
  }

  const handleRestartDownload = async (gid: string): Promise<void> => {
    try {
      // 获取原始下载信息
      const download = downloads.find((d) => d.gid === gid)
      if (download && download.files && download.files.length > 0) {
        // 使用第一个文件的URI重新开始下载
        const uri = download.files[0].path // 这里可能需要从元数据中获取原始URL
        await handleAddDownload(uri)
      }
    } catch (error) {
      console.error('重新下载失败:', error)
      alert('重新下载失败')
    }
  }

  const filteredDownloads = useMemo(() => {
    let tasks = filter === 'removed' ? removedDownloads : downloads

    // 按状态筛选
    if (filter !== 'all' && filter !== 'removed') {
      tasks = tasks.filter((d) => {
        switch (filter) {
          case 'active':
            return d.status === 'active'
          case 'waiting':
            return d.status === 'waiting'
          case 'complete':
            return d.status === 'complete'
          case 'error':
            return d.status === 'error'
          default:
            return true
        }
      })
    }

    // 按搜索查询筛选
    if (searchQuery) {
      tasks = tasks.filter((d) =>
        d.files[0]?.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return tasks
  }, [downloads, removedDownloads, filter, searchQuery])

  const downloadCounts = useMemo(() => {
    return {
      all: downloads.length,
      active: downloads.filter((d) => d.status === 'active').length,
      waiting: downloads.filter((d) => d.status === 'waiting').length,
      complete: downloads.filter((d) => d.status === 'complete').length,
      error: downloads.filter((d) => d.status === 'error').length,
      removed: removedDownloads.length
    }
  }, [downloads, removedDownloads])

  const getFileName = (task: DownloadTask): string => {
    // 首先检查aria2任务中的文件信息
    if (task.files && task.files.length > 0) {
      const path = task.files[0].path
      if (path && path.trim() !== '') {
        // 提取文件名，支持Windows和Unix路径
        const fileName = path.split('/').pop() || path.split('\\').pop() || ''
        if (fileName && fileName.trim() !== '') {
          return fileName
        }
      }
    }

    // 最后的备选方案：使用任务GID
    return `下载任务_${task.gid.slice(-8)}`
  }

  return (
    <div className={`h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 ${theme}`}>
      <TitleBar />
      <div className="flex h-[calc(100vh-2rem)]">
        {/* 左侧边栏 */}
        <Sidebar
          onFilterChange={setFilter}
          activeFilter={filter}
          onNewTaskClick={() => setIsAddModalOpen(true)}
          counts={downloadCounts}
        />

        {/* 右侧主内容区 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white/60 backdrop-blur-xl border-l border-white/20">
          {/* 顶部搜索栏 */}
          <Header onSearchChange={setSearchQuery} />

          {/* 下载列表 */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-600">加载中...</span>
              </div>
            ) : filteredDownloads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <div className="text-lg mb-2 text-slate-700">暂无下载任务</div>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-blue-500 hover:text-blue-600 transition-colors font-medium"
                >
                  点击添加新的下载任务
                </button>
              </div>
            ) : (
              <div>
                {/* 移除额外的间距，因为DownloadItemNew已经有了margin */}
                {filteredDownloads.map((task) => (
                  <DownloadItemNew
                    key={task.gid}
                    task={task}
                    fileName={getFileName(task)}
                    sourceType={getSourceType(task)}
                    onPause={() => handlePauseDownload(task.gid)}
                    onResume={() => handleResumeDownload(task.gid)}
                    onRemove={() => handleRemoveDownload(task.gid)}
                    onSelectFile={() => {
                      // 在文件管理器中显示文件
                      if (window.downloadAPI?.selectFile) {
                        window.downloadAPI.selectFile(task.gid)
                      }
                    }}
                    onOpenFile={() => {
                      // 打开文件
                      if (window.downloadAPI?.openFile) {
                        window.downloadAPI.openFile(task.gid)
                      }
                    }}
                    onOpenFolder={() => {
                      // 打开文件夹
                      if (window.downloadAPI?.openFolder) {
                        window.downloadAPI.openFolder(task.gid)
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 底部统计信息 */}
          {filteredDownloads.length > 0 && (
            <div className="border-t border-slate-200/50 p-4 bg-white/40 backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <div className="flex items-center space-x-4">
                  <span>总计: {downloadCounts.all} 个任务</span>
                  <span>下载中: {downloadCounts.active}</span>
                  <span>已完成: {downloadCounts.complete}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-1 bg-slate-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all"
                      style={{
                        width: downloadCounts.all > 0
                          ? `${(downloadCounts.complete / downloadCounts.all) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <span className="text-slate-700 font-medium">{downloadCounts.all > 0 ? Math.round((downloadCounts.complete / downloadCounts.all) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 添加下载模态框 */}
      <AddDownloadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDownload={handleAddDownload}
        onAddTorrent={handleAddTorrent}
      />

      {/* Coverx链接生成器 */}
      <CoverxGenerator
        isOpen={isCoverxGeneratorOpen}
        onClose={() => setIsCoverxGeneratorOpen(false)}
      />
    </div>
  )
}

export default App
