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

/**
 * Full-page centered loading spinner — matches the mobile app's
 * ActivityIndicator. Just a spinning circle, no text.
 *
 * Usage:
 *   if (isLoading) return <FullPageLoader />
 */
export function FullPageLoader() {
  return (
    <div className="flex flex-1 min-h-[60vh] items-center justify-center">
      <div className="relative">
        <div className="w-8 h-8 rounded-full border-[3px] border-muted" />
        <div className="absolute inset-0 w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      </div>
    </div>
  )
}
