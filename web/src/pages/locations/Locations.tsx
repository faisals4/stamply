import { useState, type FormEvent } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { Pagination } from '@/components/ui/pagination'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { AxiosError } from 'axios'
import { MapPin, Plus, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/ui/delete-button'
import { EditButton } from '@/components/ui/edit-button'
import {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  type Location,
  type LocationInput,
} from '@/lib/api/locations'
import { useSubscriptionGuard } from '@/lib/subscription/useSubscriptionGuard'

/**
 * /locations — manage branches. Each location has a geofence radius that
 * will trigger Apple/Google wallet lock-screen notifications in Phase 4.
 */
export default function LocationsPage() {
  const qc = useQueryClient()
  const guard = useSubscriptionGuard()
  const createBlocked = guard.blocked || !guard.canCreate('locations')
  const createBlockedMessage = guard.blocked ? guard.message : guard.quotaMessage('locations')

  const [page, setPage] = useState(1)

  const { data, isLoading } = usePaginatedQuery<Location>(
    ['locations'],
    (p) => listLocations({ page: p }),
    page,
  )
  const locations = data?.data ?? []
  const meta = data?.meta

  const [editing, setEditing] = useState<Location | null>(null)
  const [adding, setAdding] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  })

  return (
    <div>
      <PageHeader
        icon={<MapPin />}
        title="المواقع"
        subtitle="أضف فروع نشاطك التجاري لتفعيل إشعارات شاشة القفل عند اقتراب العملاء"
        action={
          <Button
            onClick={() => createBlocked ? alert(createBlockedMessage) : setAdding(true)}
            className={createBlocked ? 'opacity-60' : ''}
          >
            <Plus className="w-4 h-4 me-1.5" />
            إضافة موقع
          </Button>
        }
      />

      {isLoading ? (
        <FullPageLoader />
      ) : locations.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-3">
            <MapPin className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="font-semibold mb-1">لا توجد مواقع بعد</h2>
          <p className="text-sm text-muted-foreground mb-5">
            أضف أول فرع لتبدأ في الوصول لعملائك جغرافياً
          </p>
          <Button
            onClick={() => createBlocked ? alert(createBlockedMessage) : setAdding(true)}
            className={createBlocked ? 'opacity-60' : ''}
          >
            <Plus className="w-4 h-4 me-1.5" />
            إضافة موقع
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              onEdit={() => guard.blocked ? alert(guard.message) : setEditing(loc)}
              onDelete={() => {
                if (guard.blocked) { alert(guard.message); return Promise.resolve() }
                return deleteMutation.mutateAsync(loc.id)
              }}
              isDeleting={
                deleteMutation.isPending && deleteMutation.variables === loc.id
              }
              writeBlocked={guard.blocked}
            />
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-4">
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}

      {(adding || editing) && (
        <LocationFormModal
          location={editing}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */

function LocationCard({
  location,
  onEdit,
  onDelete,
  isDeleting,
  writeBlocked = false,
}: {
  location: Location
  onEdit: () => void
  onDelete: () => Promise<unknown>
  isDeleting: boolean
  writeBlocked?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold truncate">{location.name}</h3>
          </div>
          {location.address && (
            <p className="text-xs text-muted-foreground line-clamp-2">{location.address}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EditButton onClick={onEdit} label="تعديل الموقع" disabled={writeBlocked} />
          <DeleteButton
            label="حذف الموقع"
            title="حذف الموقع"
            description={
              <>
                سيتم حذف موقع <strong>{location.name}</strong> نهائياً.
              </>
            }
            confirmLabel="حذف الموقع"
            loading={isDeleting}
            disabled={writeBlocked}
            onConfirm={onDelete}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Badge variant={location.is_active ? 'default' : 'secondary'}>
          {location.is_active ? 'نشط' : 'معطّل'}
        </Badge>
        <Badge variant="outline">نطاق {location.geofence_radius_m}م</Badge>
      </div>

      {location.lat && location.lng ? (
        <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">
          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </div>
      ) : (
        <div className="text-[11px] text-amber-600">⚠️ إحداثيات غير محددة</div>
      )}

      {location.message && (
        <div className="mt-3 p-2 rounded-md bg-muted/50 text-xs italic">
          💬 {location.message}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */

function LocationFormModal({
  location,
  onClose,
}: {
  location: Location | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!location

  const [form, setForm] = useState<LocationInput>({
    name: location?.name ?? '',
    address: location?.address ?? '',
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    geofence_radius_m: location?.geofence_radius_m ?? 100,
    message: location?.message ?? '',
    is_active: location?.is_active ?? true,
  })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      isEdit ? updateLocation(location!.id, form) : createLocation(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      onClose()
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      setError(err.response?.data?.message ?? 'تعذر حفظ الموقع')
    },
  })

  const set = <K extends keyof LocationInput>(key: K, val: LocationInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('lat', pos.coords.latitude)
        set('lng', pos.coords.longitude)
      },
      () => setError('تعذر الحصول على الموقع الحالي'),
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-8"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border shadow-xl w-full max-w-md max-h-[calc(100vh-4rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">{isEdit ? 'تعديل الموقع' : 'إضافة موقع جديد'}</h2>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">اسم الموقع *</Label>
            <Input
              id="name"
              autoFocus
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="فرع العليا"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">العنوان</Label>
            <Textarea
              id="address"
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              rows={2}
              placeholder="شارع الملك فهد، الرياض"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lat">خط العرض (lat)</Label>
              <Input
                id="lat"
                type="number"
                inputMode="decimal"
                step="any"
                dir="ltr"
                value={form.lat ?? ''}
                onChange={(e) => set('lat', e.target.value ? Number(e.target.value) : null)}
                placeholder="24.7136"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lng">خط الطول (lng)</Label>
              <Input
                id="lng"
                type="number"
                inputMode="decimal"
                step="any"
                dir="ltr"
                value={form.lng ?? ''}
                onChange={(e) => set('lng', e.target.value ? Number(e.target.value) : null)}
                placeholder="46.6753"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useCurrentLocation}
            className="w-full"
          >
            <MapPin className="w-3.5 h-3.5 me-1.5" />
            استخدم موقعي الحالي
          </Button>

          <div className="space-y-1.5">
            <Label htmlFor="radius">نطاق التنبيه</Label>
            <div className="relative">
              <Input
                id="radius"
                type="number"
                inputMode="numeric"
                min={10}
                max={10000}
                dir="ltr"
                value={form.geofence_radius_m ?? 100}
                onChange={(e) => set('geofence_radius_m', Number(e.target.value))}
                className="pe-14"
                aria-describedby="radius-hint"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                متر
              </span>
            </div>
            <p id="radius-hint" className="text-[11px] text-muted-foreground">
              لما يكون العميل في هذا النطاق حول الموقع، يظهر إشعار على شاشة قفل جواله
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg">رسالة الإشعار</Label>
            <Input
              id="msg"
              value={form.message ?? ''}
              onChange={(e) => set('message', e.target.value)}
              maxLength={160}
              placeholder="أهلاً بك في فرعنا! 🎁"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => set('is_active', e.target.checked)}
            />
            الموقع نشط
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                  جارٍ الحفظ...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 me-1.5" />
                  {isEdit ? 'حفظ التعديلات' : 'إضافة الموقع'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
