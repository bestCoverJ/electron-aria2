import React, { useState, useRef, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Folder, File } from 'lucide-react'

interface AddDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  onAddDownload: (url: string, options?: any) => Promise<void>
  onAddTorrent: (file: File, options?: any) => Promise<void>
}

const AddDownloadModal: React.FC<AddDownloadModalProps> = ({
  isOpen,
  onClose,
  onAddDownload,
  onAddTorrent
}) => {
  // 主题检测
  const isDark = document.body.classList.contains('dark')
  const [url, setUrl] = useState('')
  const [downloadPath, setDownloadPath] = useState('')
  const [fileName, setFileName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showFileNameInput, setShowFileNameInput] = useState(false)
  const [tempFileName, setTempFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 自动提取文件名
  const extractFilename = (url: string): string => {
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
    return ''
  }

  // 检测并处理coverx://链接
  const processCoverxUrl = async (inputUrl: string): Promise<string> => {
    if (inputUrl.startsWith('coverx://')) {
      try {
        const result = await window.downloadAPI.parseCoverxLink(inputUrl)
        if (result.success) {
          return result.originalUrl
        } else {
          console.error('解析coverx链接失败:', result.error)
          return inputUrl // 返回原始URL
        }
      } catch (error) {
        console.error('处理coverx链接时出错:', error)
        return inputUrl
      }
    }
    return inputUrl
  }

  // 加载上次的下载路径
  useEffect(() => {
    const loadLastPath = async (): Promise<void> => {
      try {
        const lastPath = await window.downloadAPI.getLastDownloadPath()
        if (lastPath) {
          setDownloadPath(lastPath)
        }
      } catch (error) {
        console.error('加载上次下载路径失败:', error)
      }
    }

    if (isOpen) {
      loadLastPath()
    }
  }, [isOpen])

    // 监听URL变化，自动处理coverx链接和提取文件名
  useEffect(() => {
    const handleUrlChange = async (): Promise<void> => {
      if (!url) {
        setFileName('')
        return
      }

      let processedUrl = url

      // 如果是coverx链接，先解密
      if (url.startsWith('coverx://')) {
        try {
          const result = await window.downloadAPI.parseCoverxLink(url)
          if (result.success && result.originalUrl) {
            processedUrl = result.originalUrl
          }
        } catch (error) {
          console.error('处理coverx链接失败:', error)
        }
      }

      // 自动提取文件名
      const extractedName = extractFilename(processedUrl)
      if (extractedName) {
        setFileName(extractedName)
      }
    }

    const timeoutId = setTimeout(handleUrlChange, 500) // 防抖
    return () => clearTimeout(timeoutId)
  }, [url])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (isLoading) return // 防抖动

    if (!url.trim()) {
      alert('请输入下载链接')
      return
    }

    // 验证下载路径
    if (!downloadPath.trim()) {
      alert('请选择下载目录')
      return
    }

    setIsLoading(true)
    try {
      // 处理coverx://链接
      const processedUrl = await processCoverxUrl(url.trim())

      // 验证处理后的URL
      if (!processedUrl) {
        alert('链接处理失败，请检查链接是否正确')
        setIsLoading(false)
        return
      }

      // 如果没有文件名，尝试自动提取
      let finalFileName = fileName.trim()
      if (!finalFileName) {
        finalFileName = extractFilename(processedUrl)
        if (!finalFileName) {
          // 如果还是没有文件名，使用URL的最后部分作为默认文件名
          try {
            const urlObj = new URL(processedUrl)
            const pathParts = urlObj.pathname.split('/')
            const lastPart = pathParts[pathParts.length - 1]
            finalFileName = lastPart || 'download_file'
          } catch {
            finalFileName = 'download_file'
          }
        }
      }

      const options: Record<string, unknown> = {}
      if (downloadPath) {
        options.dir = downloadPath
      }
      if (finalFileName) {
        options.out = finalFileName
      }

      console.log('添加下载:', { url: processedUrl, options })
      const result = await window.downloadAPI.addDownload(processedUrl, options)
      if (result.success) {
        onAddDownload(processedUrl, options)
        handleClose()
      } else {
        console.error('添加下载失败:', result.error)
        alert(`添加下载失败: ${result.error}`)
      }
    } catch (error) {
      console.error('添加下载出错:', error)
      alert(`添加下载出错: ${String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file || isLoading) return

    setIsLoading(true)
    try {
      const options: any = {}
      if (downloadPath) options.dir = downloadPath

      await onAddTorrent(file, options)
      handleClose()
    } catch (error) {
      console.error('添加种子失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = (): void => {
    setUrl('')
    setDownloadPath('')
    setFileName('')
    setIsLoading(false)
    onClose()
  }

  const selectFolder = async (): Promise<void> => {
    try {
      // 新增：调用专用的选择文件夹接口
      const result = await window.downloadAPI.showFolderDialog()
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0]
        setDownloadPath(selectedPath)
        // 保存选择的路径以便下次使用
        await window.downloadAPI.setDownloadPath(selectedPath)
      }
    } catch (error) {
      console.error('选择文件夹失败:', error)
    }
  }

  const isMagnetLink = url.startsWith('magnet:')
  const isTorrentFile = url.endsWith('.torrent')

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                    添加下载任务
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      下载链接
                    </label>
                    <textarea
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="输入下载链接、磁力链接或拖拽种子文件..."
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${isDark ? 'bg-gray-900 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-400'}`}
                      rows={3}
                      required
                    />
                    {(isMagnetLink || isTorrentFile) && (
                      <p className="text-sm text-blue-600 mt-1">
                        检测到{isMagnetLink ? '磁力链接' : '种子文件链接'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      保存位置 (可选)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={downloadPath}
                        onChange={(e) => setDownloadPath(e.target.value)}
                        placeholder="选择下载文件夹"
                        className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-900 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-400'}`}
                      />
                      <button
                        type="button"
                        onClick={selectFolder}
                        className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <Folder className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-500'}`} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      文件名 (可选)
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="自定义文件名"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-900 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-400'}`}
                    />
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <File className="w-4 h-4" />
                      <span>选择种子文件</span>
                    </button>

                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={!url.trim() || isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isLoading ? '添加中...' : '添加下载'}
                      </button>
                    </div>
                  </div>
                </form>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".torrent"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default AddDownloadModal
