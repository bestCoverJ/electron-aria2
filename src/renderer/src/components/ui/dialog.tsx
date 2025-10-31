import * as React from 'react'

interface DialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange?.(false)
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  )
}

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => {
  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div className={`flex items-center justify-between ${className}`} {...rest}>
    {children}
  </div>
)

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div className={`text-lg font-semibold ${className}`} {...rest}>
    {children}
  </div>
)

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div className={`flex items-center justify-end gap-2 ${className}`} {...rest}>
    {children}
  </div>
)
