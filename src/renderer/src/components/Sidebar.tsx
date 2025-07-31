import React from 'react'
import { Plus, Home, Download, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from './ui/button'

interface SidebarProps {
  onFilterChange: (filter: string) => void
  onNewTaskClick: () => void
  activeFilter: string
  counts: {
    all: number
    active: number
    waiting: number
    complete: number
    error: number
    removed: number
  }
}

const Sidebar: React.FC<SidebarProps> = ({
  onFilterChange,
  onNewTaskClick,
  activeFilter,
  counts
}) => {
  const navItems = [
    { id: 'all', label: '全部', icon: Home, count: counts.all },
    { id: 'active', label: '下载中', icon: Download, count: counts.active },
    { id: 'waiting', label: '等待中', icon: Clock, count: counts.waiting },
    { id: 'complete', label: '已完成', icon: CheckCircle, count: counts.complete },
    { id: 'error', label: '出现错误', icon: AlertCircle, count: counts.error },
    { id: 'removed', label: '回收站', icon: Trash2, count: counts.removed }
  ]

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 text-slate-700 flex flex-col border-r border-blue-200/50">
      {/* Logo区域 */}
      <div className="p-6 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-lg font-semibold text-slate-800">Downloader</span>
        </div>
      </div>

      {/* 新建任务按钮 */}
      <div className="px-6 pb-6">
        <Button
          onClick={onNewTaskClick}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          新建任务
        </Button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 px-6 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onFilterChange(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer ${
              activeFilter === item.id
                ? 'bg-blue-500/20 text-blue-700 shadow-sm border border-blue-300/50'
                : 'text-slate-600 hover:bg-blue-50 hover:text-slate-700 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {item.count > 0 && (
              <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* 底部空间 */}
      <div className="p-6">
        <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
          <span>Powered by</span>
          <img src="/assets/icons/aria2.png" alt="Aria2" className="w-4 h-4 inline-block" />
          <img src="/assets/icons/electron.png" alt="Electron" className="w-4 h-4 inline-block" />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
