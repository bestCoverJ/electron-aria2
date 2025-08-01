import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ProgressProps
  extends React.HTMLProps<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative h-4 w-full overflow-hidden rounded-full bg-gray-200',
        className
      )}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-in-out"
        style={{
          transform: `translateX(-${100 - Math.min(100, Math.max(0, (value / max) * 100))}%)`
        }}
      />
    </div>
  )
)
Progress.displayName = 'Progress'

export { Progress }
