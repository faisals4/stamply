import { useState, useEffect, type FormEvent } from 'react'
import { useLocation, useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { MapPin, Check, Loader2 } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { FullPageLoader } from '@/components/ui/spinner'
import { LocationMapPicker } from '@/components/locations/LocationMapPicker'
import {
  createLocation,
  updateLocation,
  getLocation,
  type LocationInput,
} from '@/lib/api/locations'

/**
 * /admin/locations/new       — blank form for a new branch
 * /admin/locations/:id/edit  — pre-filled form loaded from the API
 *
 * Replaces the in-page `LocationFormModal` popup so the form gets its
 * own URL (back-button friendly, shareable), breathing room for the
 * geofence hints, and the standard BackButton + PageHeader pattern
 * used by every other /admin detail/form page.
 *
 * Pressing Save or Cancel navigates back to `/admin/locations` and
 * invalidates the list so the new/edited branch shows up instantly.
 */

export default function LocationFormPage() {
  const [, setLocation] = useLocation()
  const [, editParams] = useRoute<{ id: string }>('/admin/locations/:id/edit')
  const id = editParams?.id
  const isEdit = !!id
  const qc = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['location', id],
    queryFn: () => getLocation(id!),
    enabled: isEdit,
  })

  const [form, setForm] = useState<LocationInput>({
    name: '',
    name_en: '',
    address: '',
    address_en: '',
    lat: null,
    lng: null,
    geofence_radius_m: 100,
    message: '',
    is_active: true,
  })
  const [error, setError] = useState<string | null>(null)

  // Hydrate the form once the edit-mode fetch lands.
  useEffect(() => {
    if (!existing) return
    setForm({
      name: existing.name,
      name_en: existing.name_en ?? '',
      address: existing.address ?? '',
      address_en: existing.address_en ?? '',
      lat: existing.lat,
      lng: existing.lng,
      geofence_radius_m: existing.geofence_radius_m,
      message: existing.message ?? '',
      is_active: existing.is_active,
    })
  }, [existing])

  const mutation = useMutation({
    mutationFn: () =>
      isEdit ? updateLocation(Number(id), form) : createLocation(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['location', id] })
      setLocation('/admin/locations')
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      setError(err.response?.data?.message ?? 'تعذر حفظ الموقع')
    },
  })

  const set = <K extends keyof LocationInput>(
    key: K,
    val: LocationInput[K],
  ) => setForm((f) => ({ ...f, [key]: val }))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  if (isEdit && isLoading) {
    return (
      <div className="max-w-3xl">
        <BackButton href="/admin/locations" label="المواقع" />
        <FullPageLoader />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <BackButton href="/admin/locations" label="المواقع" />

      <PageHeader
        icon={<MapPin />}
        title={isEdit ? 'تعديل الموقع' : 'إضافة موقع جديد'}
        subtitle={
          isEdit
            ? 'عدّل بيانات الفرع أو نطاق الإشعارات الجغرافية'
            : 'أضف فرعاً جديداً لتفعيل إشعارات شاشة القفل عند اقتراب العملاء'
        }
      />

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Block 1 — Location on the map.
            Map comes first because positioning is the most common
            thing an operator needs to get right, and a clear map
            anchors the page visually at the top. */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>حدد الموقع على الخريطة</Label>
            <LocationMapPicker
              lat={form.lat ?? null}
              lng={form.lng ?? null}
              onChange={(lat, lng) => {
                setForm((f) => ({ ...f, lat, lng }))
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lat">خط العرض (lat)</Label>
              <Input
                id="lat"
                type="number"
                inputMode="decimal"
                step="any"
                dir="ltr"
                value={form.lat ?? ''}
                onChange={(e) =>
                  set('lat', e.target.value ? Number(e.target.value) : null)
                }
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
                onChange={(e) =>
                  set('lng', e.target.value ? Number(e.target.value) : null)
                }
                placeholder="46.6753"
              />
            </div>
          </div>
        </div>

        {/* Block 2 — Name + address (bilingual).
            Arabic is the required primary. English is optional and
            surfaces only on Apple/Google Wallet when the device
            locale is non-Arabic.

            Layout: pairs go side-by-side on sm+ (≥640px) so desktop
            users see Arabic/English alongside each other. Below sm
            (phones) the pairs stack vertically for readability. */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">اسم الموقع عربي *</Label>
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
              <Label htmlFor="name_en">
                اسم الموقع انجليزي{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  (اختياري)
                </span>
              </Label>
              <Input
                id="name_en"
                dir="ltr"
                value={form.name_en ?? ''}
                onChange={(e) => set('name_en', e.target.value)}
                placeholder="Olaya Branch"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="address">العنوان عربي</Label>
              <Textarea
                id="address"
                value={form.address ?? ''}
                onChange={(e) => set('address', e.target.value)}
                rows={2}
                placeholder="شارع الملك فهد، الرياض"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address_en">
                العنوان انجليزي{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  (اختياري)
                </span>
              </Label>
              <Textarea
                id="address_en"
                dir="ltr"
                value={form.address_en ?? ''}
                onChange={(e) => set('address_en', e.target.value)}
                rows={2}
                placeholder="King Fahd Road, Riyadh"
              />
            </div>
          </div>
        </div>

        {/* Block 3 — Notifications + active toggle. */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="radius">نطاق التنبيه</Label>
            {/* Unit label ("متر") sits OUTSIDE the input as a sibling
                in a flex row. The previous absolute-positioned suffix
                collided with the typed number because the input is
                dir="ltr" (number grows right-to-left on screen in
                RTL context) while the suffix inherited the page's
                RTL direction — so both fought for the same column. */}
            <div className="flex items-center gap-2">
              <Input
                id="radius"
                type="number"
                inputMode="numeric"
                min={10}
                max={10000}
                dir="ltr"
                value={form.geofence_radius_m ?? 100}
                onChange={(e) =>
                  set('geofence_radius_m', Number(e.target.value))
                }
                className="flex-1"
                aria-describedby="radius-hint"
              />
              <span className="text-sm text-muted-foreground shrink-0">
                متر
              </span>
            </div>
            <p id="radius-hint" className="text-[11px] text-muted-foreground">
              لما يكون العميل داخل هذا النطاق حول الموقع، يظهر إشعار على
              شاشة قفل جواله
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

          {/* Clear two-line toggle row:
                - Title explains what the toggle controls
                - Subtitle explains what "disabled" actually means so
                  the operator doesn't fear breaking a live branch
                - Switch (radix) replaces the bare HTML checkbox for a
                  more polished, touch-friendly control */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="cursor-pointer">
                تفعيل الموقع
              </Label>
              <p className="text-[11px] text-muted-foreground">
                عند التعطيل يختفي الفرع من خيارات الإشعارات والبطاقات
                دون حذفه
              </p>
            </div>
            <Switch
              id="is_active"
              checked={form.is_active ?? true}
              onCheckedChange={(v) => set('is_active', v)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation('/admin/locations')}
            disabled={mutation.isPending}
          >
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
  )
}
