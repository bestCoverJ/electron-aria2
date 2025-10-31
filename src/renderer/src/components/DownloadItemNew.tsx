import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  stats?: {
    startedAt?: number
    maxSpeed?: number
    sourceUrl?: string
  }
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])
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
      return { icon: Image, color: 'text-emerald-500', bgColor: 'bg-emerald-50 border border-emerald-100', bar: 'bg-emerald-400' }
    }
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return { icon: Video, color: 'text-purple-500', bgColor: 'bg-purple-50 border border-purple-100', bar: 'bg-purple-400' }
    }
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(extension)) {
      return { icon: Music, color: 'text-pink-500', bgColor: 'bg-pink-50 border border-pink-100', bar: 'bg-pink-400' }
    }
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
      return { icon: Archive, color: 'text-amber-500', bgColor: 'bg-amber-50 border border-amber-100', bar: 'bg-amber-400' }
    }
    if (['exe', 'msi', 'dmg', 'deb', 'rpm'].includes(extension)) {
      return { icon: Package, color: 'text-red-500', bgColor: 'bg-red-50 border border-red-100', bar: 'bg-red-400' }
    }
    if (['txt', 'doc', 'docx', 'pdf', 'rtf'].includes(extension)) {
      return { icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-50 border border-blue-100', bar: 'bg-blue-400' }
    }

    return { icon: File, color: 'text-slate-500', bgColor: 'bg-slate-50 border border-slate-100', bar: 'bg-slate-400' }
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
      className={`relative flex items-center p-4 bg-white rounded-xl border border-slate-100 transition-all duration-200 mb-3 cursor-move select-none gap-4 ${
        task.status === 'error'
          ? 'hover:border-red-200 hover:shadow-sm hover:bg-red-50/20'
          : 'hover:border-slate-200 hover:shadow-sm hover:bg-slate-50/20'
      }`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.gid)
      }}
    >
      {/* 左侧类型色条，保持高层级不被hover覆盖 */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${fileIcon.bar}`} />
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
          ref={triggerRef}
          onClick={() => {
            if (!menuOpen) {
              const rect = triggerRef.current?.getBoundingClientRect()
              if (rect) {
                // 右对齐到触发按钮，距离底部 4px
                const width = 176 // w-44
                setMenuPos({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - width })
              }
            }
            setMenuOpen((v) => !v)
          }}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
        {/* 下拉菜单 */}
        {menuOpen && createPortal(
          <div ref={menuRef} style={{ position: 'absolute', top: `${menuPos.top}px`, left: `${menuPos.left}px` }} className="z-[1000] w-44 bg-white shadow-lg border border-slate-200 rounded-lg overflow-hidden">
            {task.status === 'complete' && (
              <>
                <button onClick={onOpenFile} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">打开文件</button>
                <button onClick={onOpenFolder} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">打开文件夹</button>
                <button onClick={onRemove} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-red-600 cursor-pointer">删除文件</button>
                <div className="h-px bg-slate-200" />
              </>
            )}
            <button onClick={() => { setShowDetail(true); setMenuOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">文件详情</button>
          </div>,
          document.body
        )}
      </div>

      {/* 文件详情弹窗 */}
      {showDetail && (
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowDetail(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">文件详情</div>
              <button onClick={() => setShowDetail(false)} className="text-slate-500 hover:text-slate-700 cursor-pointer">×</button>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between"><span className="text-slate-500">文件名称</span><span className="max-w-[60%] truncate" title={fileName}>{fileName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">文件大小</span><span>{formatBytes(task.totalLength)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">下载时间</span><span>{task.stats?.startedAt ? new Date(task.stats.startedAt).toLocaleString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">下载来源</span><span title={task.stats?.sourceUrl || ''}>{task.stats?.sourceUrl ? (task.stats.sourceUrl.length>28? task.stats.sourceUrl.slice(0,28)+'…' : task.stats.sourceUrl) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">最高速度</span><span>{task.stats?.maxSpeed ? `${formatBytes(String(task.stats.maxSpeed))}/s` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">平均速度</span><span>{task.stats?.startedAt && Number(task.totalLength) > 0 ? (()=>{const sec=(Date.now()- (task.stats!.startedAt!))/1000; const avg=sec>0? Number(task.completedLength)/sec:0; return `${formatBytes(String(avg))}/s`})() : '—'}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DownloadItemNew
