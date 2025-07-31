import React from 'react'
import {
  Play,
  Pause,
  Square,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  RotateCcw
} from 'lucide-react'

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

interface DownloadItemProps {
  download: DownloadTask
  onPause: (gid: string) => void
  onResume: (gid: string) => void
  onStop: (gid: string) => void
  onRemove: (gid: string) => void
  onDelete: (gid: string) => void
  onRestart?: (gid: string) => void
}

const DownloadItem: React.FC<DownloadItemProps> = ({
  download,
  onPause,
  onResume,
  onStop,
  onRemove,
  onDelete,
  onRestart
}) => {
  const getFileName = (): string => {
    if (download.files && download.files.length > 0) {
      const path = download.files[0].path
      return path.split(/[/\\]/).pop() || '未知文件'
    }
    return '未知文件'
  }

  const getProgress = (): number => {
    const total = parseInt(download.totalLength || '0')
    const completed = parseInt(download.completedLength || '0')
    return total > 0 ? (completed / total) * 100 : 0
  }

  const formatBytes = (bytes: string): string => {
    const size = parseInt(bytes)
    if (size === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatSpeed = (speed: string): string => {
    return formatBytes(speed) + '/s'
  }

  const getStatusText = (): string => {
    switch (download.status) {
      case 'active': return '下载中'
      case 'paused': return '已暂停'
      case 'complete': return '已完成'
      case 'error': return '下载错误'
      case 'removed': return '已移除'
      case 'waiting': return '等待中'
      default: return download.status
    }
  }

  const getStatusColor = (): string => {
    switch (download.status) {
      case 'active': return 'text-blue-400'
      case 'paused': return 'text-yellow-400'
      case 'complete': return 'text-green-400'
      case 'error': return 'text-red-400'
      case 'removed': return 'text-gray-400'
      case 'waiting': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  const progress = getProgress()

  return (
    <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700 p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3 gap-2">
          <Download className="w-6 h-6 text-blue-400" />
          <div>
            <h3 className="font-medium text-white truncate max-w-md" title={getFileName()}>
              {getFileName()}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className={getStatusColor()}>{getStatusText()}</span>
              {download.status === 'active' && (
                <span>{formatSpeed(download.downloadSpeed)}</span>
              )}
              <span>
                {formatBytes(download.completedLength)} / {formatBytes(download.totalLength)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {download.status === 'active' && (
            <button
              onClick={() => onPause(download.gid)}
              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
              title="暂停"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {download.status === 'paused' && (
            <button
              onClick={() => onResume(download.gid)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="继续"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {(download.status === 'active' || download.status === 'paused' || download.status === 'waiting') && (
            <button
              onClick={() => onStop(download.gid)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="停止"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {/* 重新下载按钮 - 只对错误状态显示 */}
          {download.status === 'error' && onRestart && (
            <button
              onClick={() => onRestart(download.gid)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="重新下载"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onRemove(download.gid)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="移除到回收站"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(download.gid)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="彻底删除"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            download.status === 'complete' ? 'bg-green-500' :
            download.status === 'error' ? 'bg-red-500' :
            download.status === 'active' ? 'bg-blue-500' :
            'bg-gray-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {progress > 0 && (
        <div className="text-right text-xs text-gray-400 mt-1">
          {progress.toFixed(1)}%
        </div>
      )}

      {download.errorMessage && (
        <div className="mt-2 text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-800">
          错误: {download.errorMessage}
        </div>
      )}
    </div>
  )
}

export default DownloadItem
