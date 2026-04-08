import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * "No results / nothing here yet" placeholder with an icon, title, message
 * and optional action button. Replaces the 12 copy-pasted variants across
 * list pages so the empty-state styling stays consistent.
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className,
}: {
  icon: LucideIcon
  title?: string
  message: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('p-12 text-center', className)}>
      <Icon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
      {title && <h3 className="font-semibold text-sm mb-1">{title}</h3>}
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {action}
    </div>
  )
}
