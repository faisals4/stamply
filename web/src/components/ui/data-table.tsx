import type { ReactNode, MouseEvent } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared table primitives used across the dashboard. Consolidates the
 * `<table className="w-full text-sm">` + `<thead className="bg-muted/50 ...">`
 * pattern that was duplicated across Messages, Automations, Staff,
 * OpTenants, CustomerDetail, ReachableCustomersDialog, etc. Any future
 * row styling change lands in one place and propagates everywhere.
 *
 * The row component supports two click semantics:
 *   - `href` + `hrefTarget="new"`: opens the URL in a new tab via
 *     `window.open()` on main click and middle-click. Rows can't be
 *     true anchors because browsers refuse to render `<a>` inside
 *     `<tbody>`, so we simulate link behaviour programmatically.
 *   - `onClick`: plain handler for in-place actions (open a modal, etc.).
 *
 * Pass exactly one of the two. Passing `href` automatically applies
 * the `cursor-pointer` affordance and keyboard handlers for a11y.
 */

export function DataTable({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <table className={cn('w-full text-sm', className)}>{children}</table>
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-muted/50 text-xs text-muted-foreground sticky top-0 z-10">
      {children}
    </thead>
  )
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function DataTh({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return <th className={cn('text-start px-4 py-2.5 font-medium', className)}>{children}</th>
}

export interface DataTableRowProps {
  children: ReactNode
  /** When provided, clicking the row navigates here. */
  href?: string
  /** How to open `href`. Defaults to `self` (same tab). */
  hrefTarget?: 'self' | 'new'
  /** In-place click handler (alternative to `href`). */
  onClick?: (e: MouseEvent<HTMLTableRowElement>) => void
  className?: string
  /** Vertical alignment. Defaults to `middle`; use `top` when cells
   *  contain chips/tags that wrap to multiple lines. */
  align?: 'middle' | 'top'
}

export function DataTableRow({
  children,
  href,
  hrefTarget = 'self',
  onClick,
  className,
  align = 'middle',
}: DataTableRowProps) {
  const isInteractive = !!href || !!onClick

  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (onClick) {
      onClick(e)
      return
    }
    if (!href) return
    // Ignore clicks on interactive children (buttons, links, inputs)
    // so the row's navigate doesn't swallow their own click.
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select, textarea, [role="button"]')) {
      return
    }
    if (hrefTarget === 'new' || e.ctrlKey || e.metaKey || e.button === 1) {
      window.open(href, '_blank', 'noopener')
    } else {
      window.location.href = href
    }
  }

  // Middle-click (auxClick) also opens in a new tab when hrefTarget
  // is 'self' — matches the native anchor behaviour users expect.
  const handleAuxClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (!href) return
    if (e.button === 1) {
      e.preventDefault()
      window.open(href, '_blank', 'noopener')
    }
  }

  return (
    <tr
      onClick={isInteractive ? handleClick : undefined}
      onAuxClick={href ? handleAuxClick : undefined}
      className={cn(
        'border-t border-border transition',
        align === 'top' && 'align-top',
        isInteractive && 'cursor-pointer hover:bg-muted/30',
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function DataTd({
  children,
  className,
  mono,
  muted,
  dir,
}: {
  children?: ReactNode
  className?: string
  /** Monospace font for identifiers (phone, email, tokens). */
  mono?: boolean
  /** Muted text (for timestamps, secondary info). */
  muted?: boolean
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <td
      dir={dir}
      className={cn(
        'px-4 py-2.5',
        mono && 'font-mono text-xs',
        muted && 'text-muted-foreground text-xs',
        className,
      )}
    >
      {children}
    </td>
  )
}
