import React from 'react'
import { Search, Bell, User } from 'lucide-react'
import { Input } from './ui/input'

interface HeaderProps {
  onSearchChange: (query: string) => void
}

const Header: React.FC<HeaderProps> = ({ onSearchChange }) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white/40 backdrop-blur-md border-b border-slate-200/50">
      <div className="flex items-center space-x-6 flex-1">
        <h1 className="text-xl font-semibold text-slate-800">下载列表</h1>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="搜索文件..."
            className="bg-white/60 border-slate-200 text-slate-700 placeholder:text-slate-500 pl-10 w-80 focus:border-blue-400 focus:ring-blue-400/20"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 text-slate-600 cursor-pointer">
          <User className="w-5 h-5" />
          <span className="text-sm">用户</span>
        </div>
      </div>
    </header>
  )
}

export default Header
