import React from 'react'
import {
  File,
  Play,
  Pause,
  Trash2,
  Folder,
  MoreVertical,
  Image,
  Archive,
  Video,
  Music,
  FileText,
  Package,
  AlertTriangle
} from 'lucide-react'
import { Button } from './ui/button'

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

interface DownloadItemProps {
  task: DownloadTask
  fileName: string
  sourceType?: 'normal' | 'torrent' | 'coverx' // 新增来源类型
  onPause: () => void
  onResume: () => void
  onRemove: () => void
  onSelectFile: () => void
  onOpenFile: () => void
  onOpenFolder: () => void
}

const DownloadItemNew: React.FC<DownloadItemProps> = ({
  task,
  fileName,
  sourceType = 'normal',
  onPause,
  onResume,
  onRemove,
  onOpenFile,
  onOpenFolder
}) => {
  const formatBytes = (bytesStr: string, decimals = 2): string => {
    const bytes = Number(bytesStr)
    if (isNaN(bytes) || bytes === 0) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  // 根据文件类型获取图标和颜色 - 更轻巧的配色
  const getFileIcon = () => {
    const extension = fileName.toLowerCase().split('.').pop() || ''

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return { icon: Image, color: 'text-emerald-500', bgColor: 'bg-emerald-50 border border-emerald-100' }
    }
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return { icon: Video, color: 'text-purple-500', bgColor: 'bg-purple-50 border border-purple-100' }
    }
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(extension)) {
      return { icon: Music, color: 'text-pink-500', bgColor: 'bg-pink-50 border border-pink-100' }
    }
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
      return { icon: Archive, color: 'text-amber-500', bgColor: 'bg-amber-50 border border-amber-100' }
    }
    if (['exe', 'msi', 'dmg', 'deb', 'rpm'].includes(extension)) {
      return { icon: Package, color: 'text-red-500', bgColor: 'bg-red-50 border border-red-100' }
    }
    if (['txt', 'doc', 'docx', 'pdf', 'rtf'].includes(extension)) {
      return { icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-50 border border-blue-100' }
    }

    return { icon: File, color: 'text-slate-500', bgColor: 'bg-slate-50 border border-slate-100' }
  }

  // 获取来源文本
  const getSourceText = () => {
    switch (sourceType) {
      case 'torrent':
        return '种子文件'
      case 'coverx':
        return '极速下载'
      default:
        return '普通文件'
    }
  }

  const totalLength = BigInt(task.totalLength)
  const completedLength = BigInt(task.completedLength)
  const progress = totalLength > 0 ? Number((completedLength * 100n) / totalLength) : 0

  const fileIcon = getFileIcon()
  const IconComponent = fileIcon.icon

  return (
    <div
      className={`flex items-center p-4 bg-white rounded-xl border border-slate-100 transition-all duration-200 mb-3 cursor-move select-none ${
        task.status === 'error'
          ? 'hover:border-red-200 hover:shadow-sm hover:bg-red-50/30'
          : 'hover:border-slate-200 hover:shadow-sm hover:bg-slate-50/30'
      }`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.gid)
      }}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-12 h-12 ${fileIcon.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <IconComponent className={`w-6 h-6 ${fileIcon.color}`} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-slate-800 flex-1" title={fileName || 'N/A'}>
                {fileName || 'N/A'}
              </p>
              {task.status === 'error' && (
                <div title={task.errorMessage || '下载出错'}>
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                </div>
              )}
            </div>
            <span className={`text-xs font-medium ml-4 px-2 py-1 rounded-full ${
              task.status === 'error'
                ? 'bg-red-50 text-red-600'
                : 'bg-slate-50 text-slate-500'
            }`}>
              {task.status === 'error' ? '错误' : `${Math.round(progress)}%`}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-medium text-slate-600">{formatBytes(task.totalLength) || '0 B'}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>来源: {getSourceText()}</span>
            {task.status === 'active' && (
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-blue-500 font-medium">{formatBytes(task.downloadSpeed)}/s</span>
              </>
            )}
            {task.status === 'error' && task.errorMessage && (
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-red-500 font-medium truncate" title={task.errorMessage}>
                  {task.errorMessage}
                </span>
              </>
            )}
          </div>

          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  task.status === 'error'
                    ? 'bg-red-400'
                    : task.status === 'complete'
                    ? 'bg-emerald-400'
                    : 'bg-gradient-to-r from-blue-400 to-emerald-400'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                已下载 {formatBytes(task.completedLength) || '0 B'} / {formatBytes(task.totalLength) || '0 B'}
              </span>
              {task.status === 'error' && (
                <span className="text-red-500 font-medium">下载失败</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center ml-6 gap-2">
        {task.status === 'active' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg border border-amber-200 hover:border-amber-300 cursor-pointer transition-all duration-200"
            onClick={onPause}
          >
            <Pause className="w-4 h-4" />
          </Button>
        )}
        {(task.status === 'paused' || task.status === 'error') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-emerald-200 hover:border-emerald-300 cursor-pointer transition-all duration-200"
            onClick={onResume}
          >
            <Play className="w-4 h-4" />
          </Button>
        )}
        {task.status === 'complete' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg border border-blue-200 hover:border-blue-300 cursor-pointer transition-all duration-200"
              onClick={onOpenFile}
            >
              <File className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-purple-600 hover:bg-purple-50 hover:text-purple-700 rounded-lg border border-purple-200 hover:border-purple-300 cursor-pointer transition-all duration-200"
              onClick={onOpenFolder}
            >
              <Folder className="w-4 h-4" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg border border-red-200 hover:border-red-300 cursor-pointer transition-all duration-200"
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-slate-600 hover:bg-slate-50 hover:text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer transition-all duration-200"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

export default DownloadItemNew
