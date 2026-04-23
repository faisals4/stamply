import { useEffect, useRef, useState } from 'react'
import { Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Minimal emoji picker.
 *
 * Why not `emoji-mart`/`picmo`? Those ship 200–400 KB + their own font
 * map + a search index to support the full Unicode set. For a
 * notification composer the operator only needs the top ~60 promo /
 * marketing emojis, which the OS already renders natively. So we
 * hard-code a short, curated list and keep bundle size under 2 KB.
 *
 * The picker is a "trigger + popover" pair: clicking the small smile
 * button opens a small grid; clicking an emoji fires `onPick(e)` and
 * closes the popover. The caller is responsible for inserting the
 * emoji at the input's caret (see `insertAtCaret` helper below).
 *
 * Closes on: outside click, Escape, or any emoji selection.
 */

type Category = { label: string; emojis: string[] }

const CATEGORIES: Category[] = [
  {
    label: 'الأكثر استخداماً',
    emojis: ['🎁', '🎉', '🔥', '⭐', '💝', '✨', '🎊', '🛍️', '☕', '🍰', '🍕', '🍔'],
  },
  {
    label: 'عروض وترويج',
    emojis: ['💰', '💵', '🏷️', '🎯', '⚡', '🚀', '🎈', '🏆', '🥇', '💎', '🎪', '🔔'],
  },
  {
    label: 'وجوه ومشاعر',
    emojis: ['😊', '😍', '🤩', '🥰', '😃', '😁', '🤗', '😎', '🙌', '👏', '👍', '🙏'],
  },
  {
    label: 'قلوب ورموز',
    emojis: ['❤️', '💛', '🧡', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💖', '💗', '💕'],
  },
  {
    label: 'رموز أخرى',
    emojis: ['✅', '❗', '⚠️', '🆕', '🆓', '💯', '🎵', '📣', '📢', '📅', '📍', '📌'],
  },
]

export function EmojiPicker({
  onPick,
  className,
}: {
  onPick: (emoji: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center justify-center rounded-md w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted transition',
          open && 'text-foreground bg-muted',
        )}
        aria-label="اختر إيموجي"
        aria-expanded={open}
      >
        <Smile className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute end-0 top-full mt-1 z-50 w-[280px] rounded-lg border border-border bg-popover shadow-lg p-2"
          role="dialog"
        >
          <div className="max-h-[280px] overflow-y-auto space-y-2">
            {CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <div className="text-[10px] text-muted-foreground mb-1 px-1">
                  {cat.label}
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        onPick(e)
                        setOpen(false)
                      }}
                      className="h-7 w-7 rounded hover:bg-muted transition text-base leading-none flex items-center justify-center"
                      aria-label={e}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Insert a string at the caret of an <input> or <textarea> and return
 * the new value. Preserves the caret position AFTER the inserted text
 * so the user can keep typing without a visual jump.
 *
 * Usage:
 *   const ref = useRef<HTMLInputElement>(null)
 *   <Input ref={ref} value={x} onChange={...} />
 *   <EmojiPicker onPick={(e) => setX(insertAtCaret(ref.current, x, e))} />
 */
export function insertAtCaret(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  current: string,
  insert: string,
): string {
  if (!el) return current + insert
  const start = el.selectionStart ?? current.length
  const end = el.selectionEnd ?? current.length
  const next = current.slice(0, start) + insert + current.slice(end)
  // Restore caret after React re-renders. setTimeout(0) pushes this
  // to the next tick, AFTER the controlled value is applied.
  setTimeout(() => {
    el.focus()
    const pos = start + insert.length
    el.setSelectionRange(pos, pos)
  }, 0)
  return next
}
