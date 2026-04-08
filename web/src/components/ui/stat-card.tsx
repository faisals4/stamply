import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Unified stat card — the header widget showing a number + label + icon +
 * optional sub-label. Consolidates the 3 hand-rolled variants that lived in
 * Dashboard.tsx, Reports.tsx and OpDashboard.tsx into a single component.
 *
 * If `href` is provided, the whole card is a Link with hover feedback.
 */
export function StatCard({
  label,
  value,
  sublabel,
  icon,
  loading,
  href,
  showTrendingIcon,
  format = 'western',
  className,
}: {
  label: string
  value?: number
  sublabel?: ReactNode
  icon: ReactNode
  loading?: boolean
  href?: string
  /** Whether to prefix the sublabel with a small TrendingUp icon. */
  showTrendingIcon?: boolean
  /**
   * How to format the main number.
   *  - `'western'` (default): Western digits with thousand separators (`1,234`).
   *  - `'raw'`: just the number as-is.
   */
  format?: 'western' | 'raw'
  className?: string
}) {
  const formattedValue =
    value == null ? 0 : format === 'western' ? value.toLocaleString('en-US') : value

  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold min-h-8">
        {loading ? (
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        ) : (
          formattedValue
        )}
      </div>
      {sublabel && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          {showTrendingIcon && <TrendingUp className="w-3 h-3" />}
          {sublabel}
        </div>
      )}
    </>
  )

  const base = 'rounded-xl border border-border bg-card p-4 sm:p-5'

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          'block hover:border-primary/40 hover:shadow-sm transition cursor-pointer',
          className,
        )}
      >
        {inner}
      </Link>
    )
  }
  return <div className={cn(base, className)}>{inner}</div>
}
