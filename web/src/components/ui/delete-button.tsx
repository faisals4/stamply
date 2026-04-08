import { useState, type ReactNode } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Unified delete button used everywhere in the app.
 *
 * ONE size across every screen: 36×36 (w-9 h-9) for the icon variant,
 * and h-9 for the wide variant so the two visually align when mixed
 * with other page-header buttons. Previous `size='sm'` was removed on
 * purpose — having multiple sizes drifted the UI apart between the
 * cards list and the rest of the app.
 *
 * Two visual variants:
 *   - `icon` (default): a bordered square with just the trash glyph.
 *     Used in lists, table rows, and card headers.
 *   - `wide`: a full button with trash icon + label text. Used in
 *     page headers where the destructive action deserves more space.
 *
 * Behavior: clicking opens a Radix Dialog asking the operator to
 * confirm. The confirm button wires itself to `onConfirm`, shows a
 * spinner while `loading` is true, and closes the dialog on success.
 *
 * Pass `title`, `description`, and `confirmLabel` to localise the copy
 * for each call site (deleting a tenant is a scarier decision than
 * deleting a draft message, so the copy matters).
 */
export interface DeleteButtonProps {
  /** Called when the operator clicks "تأكيد الحذف" in the dialog. */
  onConfirm: () => void | Promise<void>
  /** Disable interaction + show spinner on the confirm button. */
  loading?: boolean
  /** Screen-reader label + tooltip text for the trigger button. */
  label?: string
  /** Dialog title. Defaults to "تأكيد الحذف". */
  title?: string
  /** Dialog body copy. Optional — keep it short. */
  description?: ReactNode
  /** Confirm button text. Defaults to "حذف". */
  confirmLabel?: string
  /** Visual variant of the trigger button. */
  variant?: 'icon' | 'wide'
  /** Extra classes merged onto the trigger button. */
  className?: string
  /** Disable the trigger entirely (e.g. a sent message can't be deleted). */
  disabled?: boolean
  /**
   * Text shown on the trigger when `variant='wide'`. Defaults to the
   * same string as `label`. In `icon` mode this is ignored — the
   * label is surfaced through the tooltip instead.
   */
  triggerText?: string
}

export function DeleteButton({
  onConfirm,
  loading = false,
  label = 'حذف',
  title = 'تأكيد الحذف',
  description,
  confirmLabel = 'حذف',
  variant = 'icon',
  className,
  disabled = false,
  triggerText,
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    await onConfirm()
    // The caller controls `loading`; we close immediately once the
    // promise resolves so the fading row doesn't linger behind the
    // dialog. Errors are expected to be surfaced by the caller.
    setOpen(false)
  }

  // Shared hover styles — red background, white icon/text. The SVG
  // selector forces lucide's `currentColor` strokes to follow even
  // when React hasn't repainted the parent text-color class.
  const hoverDestructive =
    'hover:bg-destructive hover:text-white hover:border-destructive [&:hover>svg]:text-white [&:hover_svg]:text-white'

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!disabled) setOpen(true)
  }

  // Trigger differs between the two variants but the rest of the
  // dialog machinery is shared below.
  const trigger =
    variant === 'wide' ? (
      <button
        type="button"
        disabled={disabled}
        onClick={handleTriggerClick}
        aria-label={label}
        className={cn(
          'inline-flex items-center h-9 rounded-md border px-3 bg-card text-sm text-muted-foreground shrink-0 transition-colors',
          hoverDestructive,
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:text-muted-foreground disabled:hover:border-border',
          className,
        )}
      >
        <Trash2 className="w-4 h-4 me-1.5" />
        {triggerText ?? label}
      </button>
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            onClick={handleTriggerClick}
            aria-label={label}
            className={cn(
              // w-10 h-10 (40px) on mobile for touch, w-9 h-9 (36px) on sm+ for
              // compact desktop table rows.
              'w-10 h-10 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-md border bg-card text-muted-foreground shrink-0 transition-colors',
              hoverDestructive,
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:text-muted-foreground disabled:hover:border-border',
              className,
            )}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    )

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent
          // Force RTL on the portal even though <html> is already rtl
          // — Radix portals mount at body level and some locales/tests
          // may toggle the root dir. Being explicit here guarantees the
          // header text, close button, and button row all render in
          // the correct Arabic reading order regardless of ancestry.
          dir="rtl"
          className="sm:max-w-md text-right"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Override the Dialog primitive's `sm:text-left` default so
              the title and body hug the start edge (right side in RTL)
              instead of drifting left on larger screens. */}
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          {/* Button order note: with `dir=rtl + flex-row + justify-end`
              the first JSX child lands on the visual right (leading
              edge) and subsequent children flow to the left. That
              gives us [إلغاء] on the right and [حذف] on the left —
              matching the macOS Arabic convention where the primary
              destructive action sits at the trailing edge. */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                  جارٍ الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 me-1.5" />
                  {confirmLabel}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
