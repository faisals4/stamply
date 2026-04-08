import { cn } from '@/lib/utils'

interface FilterPillItem<T extends string> {
  key: T
  label: string
}

/**
 * A row of rounded pill-style filter buttons. Highlights the selected one
 * with the primary color. Replaces the hand-rolled `flex flex-wrap gap-2`
 * + inline button pattern found in every list page with filters.
 */
export function FilterPills<T extends string>({
  items,
  selected,
  onSelect,
  className,
}: {
  items: FilterPillItem<T>[]
  selected: T
  onSelect: (key: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onSelect(f.key)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-full border transition',
            selected === f.key
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-primary/40',
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
