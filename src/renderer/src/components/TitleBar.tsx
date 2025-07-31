import React from 'react'
import { X, Minus, Square } from 'lucide-react'

interface TitleBarProps {
  title?: string
}

const TitleBar: React.FC<TitleBarProps> = ({ title = 'Electron Aria2 下载器' }) => {
  // 获取主题状态
  const isDark = document.body.classList.contains('dark')

  const handleMinimize = () => {
    window.downloadAPI.windowMinimize()
  }

  const handleMaximize = () => {
    window.downloadAPI.windowMaximize()
  }

  const handleClose = () => {
    window.downloadAPI.windowClose()
  }

  return (
    <div
      className={`flex items-center justify-between h-[41px] px-4 select-none ${
        isDark ? 'bg-transparent text-white' : 'bg-transparent text-gray-900'
      }`}
      style={
        {
          WebkitAppRegion: 'drag'
        } as any
      }
    >
      <div className="flex items-center gap-2 space-x-3">
        <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
          <span className="text-xs font-bold text-white">A</span>
        </div>
        <span className="text-sm font-medium">{title}</span>
      </div>

      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={handleMinimize}
          className={`w-8 h-[41px] flex items-center justify-center transition-colors ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          }`}
          title="最小化"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={handleMaximize}
          className={`w-8 h-[41px] flex items-center justify-center transition-colors ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          }`}
          title="最大化"
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          onClick={handleClose}
          className="w-8 h-[41px] flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
