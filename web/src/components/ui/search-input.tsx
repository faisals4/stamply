import { Search } from 'lucide-react'
import { Input } from './input'
import { cn } from '@/lib/utils'

/**
 * Search input with the magnifier icon pinned to the start. Replaces the
 * duplicated `<div className="relative">` + absolute-positioned icon pattern
 * found on every list page.
 *
 * Debouncing is left to the caller — they usually have other dependent state
 * (pagination, filters) that all need to reset at the same time, so we keep
 * this component dumb and let the parent own the `useDebounce` call.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  id,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ps-9"
      />
    </div>
  )
}
