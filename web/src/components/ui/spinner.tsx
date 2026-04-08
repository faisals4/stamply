import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Simple spinner wrapper — `<Loader2 animate-spin>` with a default size and
 * optional inline label. Keeps the loading UI consistent across the app.
 */
export function Spinner({
  label,
  size = 4,
  className,
}: {
  label?: string
  size?: 3 | 4 | 5 | 6
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-muted-foreground', className)}>
      <Loader2 className={cn('animate-spin', `w-${size}`, `h-${size}`)} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  )
}

/** Centered full-block loading state — used inside tables, modals, etc. */
export function LoadingBlock({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin inline-block me-2" />
      {label}
    </div>
  )
}
