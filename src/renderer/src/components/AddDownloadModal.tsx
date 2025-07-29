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

  // URL变化时自动提取文件名
  useEffect(() => {
    if (url) {
      const extractedFilename = extractFilename(url)
      if (extractedFilename) {
        setFileName(extractedFilename)
      }
    }
  }, [url])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!url.trim()) return

    setIsLoading(true)
    try {
      const options: any = {}
      if (downloadPath) options.dir = downloadPath
      if (fileName) options.out = fileName

      await onAddDownload(url.trim(), options)
      handleClose()
    } catch (error) {
      console.error('添加下载失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return

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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                    className="text-gray-400 hover:text-gray-600"
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
                        className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <File className="w-4 h-4" />
                      <span>选择种子文件</span>
                    </button>

                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={!url.trim() || isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
