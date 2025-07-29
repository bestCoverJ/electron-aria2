import React, { useState, useEffect } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import TitleBar from './components/TitleBar'
import DownloadItem from './components/DownloadItem'
import AddDownloadModal from './components/AddDownloadModal'

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

function App(): React.JSX.Element {
  const [downloads, setDownloads] = useState<DownloadTask[]>([])
  const [removedDownloads, setRemovedDownloads] = useState<DownloadTask[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [theme, setTheme] = useState<'dark' | 'light'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

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
      if (isDownloadableUrl(text)) {
        const shouldOpen = confirm(
          `检测到剪切板中有下载链接：\n${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n\n是否立即添加下载任务？`
        )
        if (shouldOpen) {
          setIsAddModalOpen(true)
          // 延迟设置URL，确保模态框已打开
          setTimeout(() => {
            const urlInput = document.querySelector(
              'textarea[placeholder*="下载链接"]'
            ) as HTMLTextAreaElement
            if (urlInput) {
              urlInput.value = text
              urlInput.dispatchEvent(new Event('input', { bubbles: true }))
            }
          }, 100)
        }
      }
    } catch (error) {
      // 剪切板权限被拒绝或其他错误，静默处理
      console.log('无法读取剪切板内容')
    }
  }

  // 判断是否为可下载的URL
  const isDownloadableUrl = (text: string): boolean => {
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

  const filteredDownloads =
    filter === 'removed'
      ? removedDownloads
      : downloads.filter((download) => {
          switch (filter) {
            case 'active':
              return download.status === 'active'
            case 'paused':
              return download.status === 'paused'
            case 'completed':
              return download.status === 'complete' || download.status === 'error'
            default:
              return true
          }
        })

  const getFilterCount = (status: string): number => {
    if (status === 'all') return downloads.length
    return downloads.filter((d) => d.status === status).length
  }

  return (
    <div
      className={`flex flex-col h-screen ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
      style={{
        background: theme === 'dark' ? 'transparent' : 'transparent'
      }}
    >
      {/* 自定义标题栏 */}
      <TitleBar />

      {/* 主内容区域 */}
      <div className="flex-1 flex">
        {/* 侧边栏 */}
        <div
          className={`w-64 border-r p-4 flex flex-col gap-4 ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
          style={{
            // background: theme === 'dark' ? 'rgba(17, 24, 39, 0.75)' : 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(16px)'
          }}
        >
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mb-4"
          >
            <Plus className="w-5 h-5" />
            <span>新建任务</span>
          </button>

          <div className="space-y-2">
            <button
              onClick={() => setFilter('all')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              全部 ({getFilterCount('all')})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                filter === 'active' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              下载中 ({getFilterCount('active')})
            </button>
            <button
              onClick={() => setFilter('paused')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                filter === 'paused' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              已暂停 ({getFilterCount('paused')})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                filter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              已完成 ({getFilterCount('complete')})
            </button>
            <button
              onClick={() => setFilter('removed')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                filter === 'removed' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              已删除 ({removedDownloads.length})
            </button>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col">
          {/* 工具栏 */}
          <div
            className={`px-6 py-4 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}
            style={{
              background: theme === 'dark' ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(16px)'
            }}
          >
            <div className="flex items-center justify-between">
              <h1
                className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                下载管理器
              </h1>
              <button
                onClick={() => {
                  loadDownloads()
                  loadRemovedDownloads()
                }}
                disabled={isLoading}
                className={`flex items-center space-x-2 px-3 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'} disabled:opacity-50`}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>刷新</span>
              </button>
            </div>
          </div>

          {/* 下载列表 */}
          <div
            className="flex-1 overflow-y-auto p-6"
            style={{
              background: theme === 'dark' ? 'rgba(17, 24, 39, 0.4)' : 'rgba(243, 246, 251, 0.4)',
              backdropFilter: 'blur(20px)'
            }}
          >
            {filteredDownloads.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400">
                  {downloads.length === 0
                    ? '暂无下载任务'
                    : `暂无${filter === 'all' ? '' : '符合条件的'}下载任务`}
                </div>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 text-blue-400 hover:text-blue-300"
                >
                  添加新的下载任务
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDownloads.map((download) => (
                  <DownloadItem
                    key={download.gid}
                    download={download}
                    onPause={handlePauseDownload}
                    onResume={handleResumeDownload}
                    onStop={handleStopDownload}
                    onRemove={handleRemoveDownload}
                    onDelete={handleDeleteDownload}
                    onRestart={handleRestartDownload}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 添加下载模态框 */}
      <AddDownloadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDownload={handleAddDownload}
        onAddTorrent={handleAddTorrent}
      />
    </div>
  )
}

export default App
