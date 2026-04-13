import { ArrowRight } from 'lucide-react'
import { useLocation } from 'wouter'
import { cn } from '@/lib/utils'

/**
 * Reusable back-to-previous-page button with a RTL-aware arrow.
 *
 * Replaces the 18+ copy-pasted variants across detail/report pages. Renders
 * the same minimal look everywhere so the header pattern is identical.
 *
 * Two variants:
 *  - default: arrow + label text (used at the top of detail/report pages)
 *  - `iconOnly`: just the arrow in a plain button (used inline with a title
 *    like in the card editor header where the label would duplicate the
 *    page title sitting right next to it)
 */
export function BackButton({
  href,
  label,
  iconOnly,
  className,
  ariaLabel,
}: {
  href: string
  /** Shown next to the arrow in the default variant. Ignored when `iconOnly`. */
  label?: string
  /** Render just the arrow. `ariaLabel` becomes required for accessibility. */
  iconOnly?: boolean
  className?: string
  ariaLabel?: string
}) {
  const [, setLocation] = useLocation()

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => setLocation(href)}
        aria-label={ariaLabel ?? label ?? 'رجوع'}
        className={cn(
          'w-12 h-12 -ms-1 inline-flex items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted transition',
          className,
        )}
      >
        <ArrowRight className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setLocation(href)}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition',
        className,
      )}
    >
      <ArrowRight className="w-4 h-4" />
      {label}
    </button>
  )
}
