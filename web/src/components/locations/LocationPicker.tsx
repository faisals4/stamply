import { useQuery } from '@tanstack/react-query'
import { Check, MapPin, AlertCircle } from 'lucide-react'
import { listLocations } from '@/lib/api/locations'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  value: number[]
  onChange: (ids: number[]) => void
  /** Hard cap from Apple Wallet — Apple ignores anything beyond 10 in
   *  pass.json::locations. Default 10. */
  max?: number
}

/**
 * Multi-select picker for branches that should trigger a geofence
 * notification on a card. Used inside the card editor's "النصوص" /
 * "الإعدادات" tab to power the `card_template_location` pivot.
 *
 * - Lists every active branch with valid coordinates.
 * - Disables the unselected items once the cap is reached.
 * - Shows a per-row warning badge for branches missing lat/lng (they
 *   can't be geofenced even if selected).
 * - Empty state links the user to /admin/locations to add branches.
 */
export function LocationPicker({ value, onChange, max = 10 }: Props) {
  // listLocations returns a Paginated envelope, not a bare array.
  // Extracting `.data` here prevents `locations.map is not a function`
  // crashes that would wipe this picker (and its parent form) into
  // a blank screen.
  const { data: page, isLoading, error } = useQuery({
    queryKey: ['locations'],
    queryFn: () => listLocations(),
  })
  const locations = page?.data ?? []

  const selectedSet = new Set(value)
  const atCap = value.length >= max

  const toggle = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id))
      return
    }
    if (atCap) return
    onChange([...value, id])
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
        جاري تحميل الفروع...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        تعذّر تحميل الفروع. حاول مرة أخرى.
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
        <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <div className="text-sm font-medium mb-1">لا توجد فروع بعد</div>
        <p className="text-xs text-muted-foreground mb-3">
          أضف فروعك من صفحة المواقع لتفعيل إشعارات الاقتراب
        </p>
        <a
          href="/admin/locations"
          className="text-xs text-primary hover:underline"
        >
          اذهب لصفحة المواقع ←
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          اختر الفروع التي تظهر فيها هذه البطاقة
        </span>
        <span
          className={cn(
            'tabular-nums font-medium',
            atCap ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {value.length}/{max}
        </span>
      </div>

      <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
        {locations.map((loc) => {
          const selected = selectedSet.has(loc.id)
          const missingCoords = loc.lat === null || loc.lng === null
          const inactive = !loc.is_active
          const disabled = !selected && (atCap || missingCoords || inactive)

          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => !disabled && toggle(loc.id)}
              disabled={disabled}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-start transition',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selected && 'bg-primary/5',
                !disabled && 'hover:bg-muted/50',
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition',
                  selected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-input',
                )}
              >
                {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{loc.name}</div>
                {loc.address && (
                  <div className="text-[11px] text-muted-foreground truncate">
                    {loc.address}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {inactive && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    غير نشط
                  </Badge>
                )}
                {missingCoords && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-700"
                  >
                    <AlertCircle className="w-2.5 h-2.5 me-0.5" />
                    بدون إحداثيات
                  </Badge>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {atCap && (
        <p className="text-[11px] text-destructive">
          وصلت للحد الأقصى ({max} فروع). آبل لا تدعم أكثر من ذلك في البطاقة الواحدة.
        </p>
      )}
    </div>
  )
}
