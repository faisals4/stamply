import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Standard page header used on every main tenant/op section page.
 *
 * Unified style:
 *   - `<h1>` at `text-2xl md:text-3xl font-bold`
 *   - Optional icon at the start of the title, always forced to
 *     `text-foreground` (solid black/neutral) and a fixed size so
 *     every section header looks identical regardless of which lucide
 *     icon is passed.
 *   - Optional subtitle / description below
 *   - Optional action slot on the end side (usually a primary CTA)
 *
 * Callers should pass a bare lucide icon WITHOUT any colour classes:
 *     <PageHeader icon={<Wallet />} title="إعلانات Apple Wallet" />
 * The wrapper sizes + colours it. Both `subtitle` and `description`
 * are accepted for the same slot — different pages historically used
 * different prop names, both continue to work.
 */
export function PageHeader({
  title,
  subtitle,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** Alias for `subtitle` — renders identically. */
  description?: ReactNode
  action?: ReactNode
  /** Lucide icon rendered at the start of the title. Colour + size
   *  are forced by the wrapper — pass a bare icon. */
  icon?: ReactNode
  className?: string
}) {
  const sub = subtitle ?? description
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2.5">
          {icon && (
            <span
              className="text-foreground shrink-0 [&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-7 sm:[&>svg]:h-7 md:[&>svg]:w-8 md:[&>svg]:h-8"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          {title}
        </h1>
        {sub && (
          <p className="text-muted-foreground text-sm mt-1">{sub}</p>
        )}
      </div>
      {action && <div className="sm:shrink-0 [&>*]:flex-wrap">{action}</div>}
    </header>
  )
}
