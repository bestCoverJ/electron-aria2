import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const isDark = document.body.classList.contains('dark')
  const [activeTab, setActiveTab] = useState<'ui' | 'download' | 'engine'>('ui')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [downloadPath, setDownloadPath] = useState('')
  const [limit, setLimit] = useState<string>('0') // 0 表示不限速（B/s）
  // 引擎配置
  const [engineMode, setEngineMode] = useState<'internal' | 'external'>('internal')
  const [aria2Path, setAria2Path] = useState('')
  const [rpcHost, setRpcHost] = useState('127.0.0.1')
  const [rpcPort, setRpcPort] = useState('6800')
  const [rpcSecret, setRpcSecret] = useState('electron-aria2')
  const [connMessage, setConnMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
  const s = await window.downloadAPI.getSettings()
        setDownloadPath(s.downloadPath || '')
        setTheme((s.theme as any) || 'system')
        setLimit((s.downloadLimit as any) || '0')
  if ((s as any).engineMode) setEngineMode((s as any).engineMode)
  if ((s as any).aria2Path) setAria2Path((s as any).aria2Path)
  if ((s as any).rpcHost) setRpcHost((s as any).rpcHost)
  if ((s as any).rpcPort) setRpcPort(String((s as any).rpcPort))
  if ((s as any).rpcSecret) setRpcSecret((s as any).rpcSecret)
      } catch {
        try {
          const last = await window.downloadAPI.getLastDownloadPath()
          setDownloadPath(last || '')
        } catch {}
      }
    }
    if (isOpen) {
      load()
    }
  }, [isOpen])

  const handleSelectFolder = async (): Promise<void> => {
    const result = await window.downloadAPI.showFolderDialog()
    if (!result.canceled && result.filePaths.length > 0) {
      const p = result.filePaths[0]
      setDownloadPath(p)
      await window.downloadAPI.setDownloadPath(p)
    }
  }

  const applyTheme = async (t: 'system' | 'light' | 'dark') => {
    setTheme(t)
    if (window.downloadAPI as any) {
      // 可选：通知主进程设置主题（需要主进程支持）
      ;(window.downloadAPI as any).setTheme?.(t)
    }
  }

  const applyLimit = async () => {
    const v = limit.trim()
    // 传到主进程（需要主进程支持 setDownloadLimit）
    ;(window.downloadAPI as any).setDownloadLimit?.(v)
    alert('已应用下载限速设置')
  }

  const handleSelectAria2 = async (): Promise<void> => {
    const res = await window.downloadAPI.selectExecutable()
    if (!res.canceled && res.filePaths.length > 0) {
      setAria2Path(res.filePaths[0])
    }
  }

  const saveEngineConfig = async (): Promise<void> => {
    await window.downloadAPI.setEngineConfig({
      engineMode,
      aria2Path: engineMode === 'internal' ? aria2Path : null,
      rpcHost: engineMode === 'external' ? rpcHost : undefined,
      rpcPort: engineMode === 'external' ? Number(rpcPort) : undefined,
      rpcSecret: engineMode === 'external' ? rpcSecret : undefined
    })
  alert('已保存下载引擎配置')
  }

  const testConnection = async (): Promise<void> => {
    setConnMessage(null)
    const res = await window.downloadAPI.testAria2Connection({
      engineMode,
      aria2Path,
      rpcHost,
      rpcPort: Number(rpcPort),
      rpcSecret
    })
  setConnMessage(res.success ? '下载引擎连接成功' : `连接失败：${res.error || ''}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v)=>{ if(!v) onClose() }}>
      <DialogContent>
        <div className={`w-[880px] h-[560px] overflow-hidden rounded-2xl ${isDark ? 'bg-slate-900/95 text-slate-100' : 'bg-white/95 text-slate-900'} border ${isDark ? 'border-slate-700/30' : 'border-slate-200'} shadow-xl flex flex-col`}>
          <div className={`flex items-center ${isDark ? 'border-b border-slate-700/30' : 'border-b border-slate-200'}`}>
            <DialogHeader className="flex-1 px-6 py-4"><DialogTitle>设置</DialogTitle></DialogHeader>
            <button onClick={onClose} className="px-4 text-slate-500 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-1 min-h-0">
            {/* 左侧菜单 */}
            <div className={`w-56 p-4 space-y-2 ${isDark ? 'border-r border-slate-700/30' : 'border-r border-slate-200'} overflow-auto`}>
              <button onClick={() => setActiveTab('ui')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='ui' ? 'bg-blue-50 text-blue-700 border border-blue-200' : (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50')} cursor-pointer`}>
                界面设置
              </button>
              <button onClick={() => setActiveTab('download')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='download' ? 'bg-blue-50 text-blue-700 border border-blue-200' : (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50')} cursor-pointer`}>
                下载设置
              </button>
              <button onClick={() => setActiveTab('engine')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='engine' ? 'bg-blue-50 text-blue-700 border border-blue-200' : (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50')} cursor-pointer`}>
                下载引擎
              </button>
            </div>
            {/* 右侧内容卡片 */}
            <div className="flex-1 p-8 overflow-auto">
              {activeTab === 'ui' && (
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-slate-500 mb-2">主题模式</div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => applyTheme('system')} className={`${theme==='system' ? 'border-blue-400 bg-blue-50 text-blue-700' : ''}`}>跟随系统</Button>
                      <Button variant="outline" onClick={() => applyTheme('light')} className={`${theme==='light' ? 'border-blue-400 bg-blue-50 text-blue-700' : ''}`}>浅色</Button>
                      <Button variant="outline" onClick={() => applyTheme('dark')} className={`${theme==='dark' ? 'border-blue-400 bg-blue-50 text-blue-700' : ''}`}>深色</Button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'download' && (
                <div className="space-y-8">
                  <div>
                    <div className="text-sm text-slate-500 mb-2">默认下载目录</div>
                    <div className="flex gap-2">
                      <Input value={downloadPath} onChange={(e)=>setDownloadPath(e.target.value)} className={`flex-1 ${isDark ? 'border-slate-700/40 bg-slate-900/40 placeholder-slate-400' : ''}`} placeholder="选择文件夹" />
                      <Button variant="outline" onClick={handleSelectFolder}>选择</Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 mb-2">下载限速（B/s，0 表示不限速）</div>
                    <div className="flex gap-2">
                      <Input value={limit} onChange={(e)=>setLimit(e.target.value)} className={`flex-1 ${isDark ? 'border-slate-700/40 bg-slate-900/40 placeholder-slate-400' : ''}`} placeholder="例如：0 或 524288 (512KB/s)" />
                      <Button variant="outline" onClick={applyLimit}>应用</Button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'engine' && (
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-slate-500 mb-2">引擎模式</div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="engineMode" checked={engineMode==='internal'} onChange={()=>setEngineMode('internal')} /> 内置引擎
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="engineMode" checked={engineMode==='external'} onChange={()=>setEngineMode('external')} /> 外部 RPC
                      </label>
                    </div>
                  </div>
                  {engineMode==='internal' ? (
                    <div className="space-y-3">
                      <div className="text-sm text-slate-500">下载引擎可执行文件路径</div>
                      <div className="flex gap-2">
                        <Input value={aria2Path} onChange={(e)=>setAria2Path(e.target.value)} placeholder="例如：C:\\Tools\\aria2\\aria2c.exe" />
                        <Button variant="outline" onClick={handleSelectAria2}>浏览</Button>
                      </div>
                      <div className="text-xs text-slate-500">若不填写，将使用默认内置路径（开发：src/main/lib/...；生产：resources/lib/...）。</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-sm text-slate-500 mb-1">RPC Host</div>
                        <Input value={rpcHost} onChange={(e)=>setRpcHost(e.target.value)} placeholder="127.0.0.1" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">RPC 端口</div>
                        <Input value={rpcPort} onChange={(e)=>setRpcPort(e.target.value)} placeholder="6800" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">RPC 密钥</div>
                        <Input value={rpcSecret} onChange={(e)=>setRpcSecret(e.target.value)} placeholder="electron-aria2" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Button onClick={saveEngineConfig}>保存</Button>
                    <Button variant="outline" onClick={testConnection}>测试连接</Button>
                    {connMessage && (<span className="text-sm text-slate-500">{connMessage}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
