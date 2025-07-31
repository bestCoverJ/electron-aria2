import React, { useState } from 'react'
import { Copy, Link, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface CoverxGeneratorProps {
  isOpen: boolean
  onClose: () => void
}

const CoverxGenerator: React.FC<CoverxGeneratorProps> = ({ isOpen, onClose }) => {
  const [originalUrl, setOriginalUrl] = useState('')
  const [coverxUrl, setCoverxUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!originalUrl.trim()) {
      alert('请输入原始URL')
      return
    }

    setIsGenerating(true)
    try {
      const result = await window.downloadAPI.createCoverxLink(originalUrl.trim())
      if (result.success && result.coverxLink) {
        setCoverxUrl(result.coverxLink)
      } else {
        alert(`生成失败: ${result.error}`)
      }
    } catch (error) {
      alert(`生成出错: ${String(error)}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (coverxUrl) {
      try {
        await navigator.clipboard.writeText(coverxUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('复制失败:', error)
      }
    }
  }

  const handleClose = () => {
    setOriginalUrl('')
    setCoverxUrl('')
    setCopied(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Link className="w-5 h-5" />
              Coverx链接生成器
            </h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                原始下载链接
              </label>
              <Input
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                placeholder="https://example.com/file.zip"
                className="w-full"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !originalUrl.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isGenerating ? '生成中...' : '生成Coverx链接'}
            </Button>

            {coverxUrl && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Coverx链接 (已加密)
                </label>
                <div className="flex gap-2">
                  <Input
                    value={coverxUrl}
                    readOnly
                    className="flex-1 bg-slate-50 text-slate-600"
                  />
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600 mt-1">已复制到剪贴板</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 text-xs text-slate-500">
            <p>Coverx链接使用AES加密保护原始URL，可安全分享。</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoverxGenerator
