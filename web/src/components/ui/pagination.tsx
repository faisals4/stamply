import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationMeta } from '@/types/pagination'
import { cn } from '@/lib/utils'

interface PaginationProps {
  meta: PaginationMeta | undefined
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Reusable numbered-page paginator. Shows up to 7 page buttons with ellipsis
 * when there are more pages, plus prev/next arrows (RTL-aware) and a
 * "showing X–Y of Z" label on the start side.
 *
 * Used by every paginated list/table in the app so pagination behaves
 * identically everywhere. Hides itself entirely when there's only one page.
 */
export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  if (!meta || meta.last_page <= 1) return null

  const pages = computePageList(meta.current_page, meta.last_page)

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t', className)}>
      <div className="text-xs text-muted-foreground text-center sm:text-start">
        عرض {meta.from ?? 0}–{meta.to ?? 0} من {meta.total}
      </div>
      <div className="flex items-center justify-center sm:justify-end gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => onPageChange(meta.current_page - 1)}
          disabled={meta.current_page === 1}
          aria-label="السابق"
          className="h-10 w-10 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-md border bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1.5 text-xs text-muted-foreground select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === meta.current_page ? 'page' : undefined}
              className={cn(
                'h-10 min-w-10 sm:h-9 sm:min-w-9 px-2 inline-flex items-center justify-center rounded-md border text-xs font-medium transition',
                p === meta.current_page
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground hover:bg-accent',
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(meta.current_page + 1)}
          disabled={meta.current_page === meta.last_page}
          aria-label="التالي"
          className="h-10 w-10 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-md border bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Compute the list of page tokens to render. Returns numbers and 'ellipsis'
 * markers. Guarantees:
 *  - first + last page are always visible
 *  - current page is always visible
 *  - at most 7 numeric buttons + up to 2 ellipses
 *
 * Examples (current shown in parens):
 *   (1) 2 3 4 5 … 34
 *   1 … 8 9 (10) 11 12 … 34
 *   1 … 30 31 32 33 (34)
 */
function computePageList(current: number, last: number): (number | 'ellipsis')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)

  const pages: (number | 'ellipsis')[] = []
  const add = (p: number) => {
    if (!pages.includes(p)) pages.push(p)
  }

  add(1)
  if (current > 4) pages.push('ellipsis')

  const start = Math.max(2, current - 2)
  const end = Math.min(last - 1, current + 2)
  for (let i = start; i <= end; i++) add(i)

  if (current < last - 3) pages.push('ellipsis')
  add(last)

  return pages
}
