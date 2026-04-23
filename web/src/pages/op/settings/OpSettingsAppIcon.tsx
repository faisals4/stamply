import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Check, Smartphone } from 'lucide-react'
import {
  getAppIconConfig,
  setAppIconVariant,
  type AppIconVariant,
  type AppIconVariantKey,
} from '@/lib/api/op/settings'

/**
 * OpSettingsAppIcon — operator-facing page for switching the mobile
 * app's alternate icon variant.
 *
 * The five icons (default, white, ramadan, eid, national_day) are
 * BUNDLED in the iOS app binary at build time. This page doesn't
 * upload anything — it just picks which bundled variant the client
 * app should set as active. When the admin clicks "تفعيل", the
 * selection is persisted to platform_settings. On the mobile side
 * the app polls /api/app/config/app-icon on cold start and on
 * foreground, compares to the currently-set icon, and (if different)
 * calls iOS's setAlternateIconName which shows the mandatory system
 * confirmation dialog — the user must tap "Change" before the icon
 * actually swaps. Apple policy, cannot be bypassed.
 *
 * Adding a sixth variant requires a mobile app update — this page
 * only lists the variants the backend explicitly whitelists.
 */
export default function OpSettingsAppIconPage() {
  const qc = useQueryClient()
  const [pendingKey, setPendingKey] = useState<AppIconVariantKey | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['op-settings', 'app-icon'],
    queryFn: getAppIconConfig,
  })

  const mutation = useMutation({
    mutationFn: setAppIconVariant,
    onSuccess: (fresh) => {
      qc.setQueryData(['op-settings', 'app-icon'], fresh)
      setPendingKey(null)
    },
    onError: () => setPendingKey(null),
  })

  const handleActivate = (key: AppIconVariantKey) => {
    if (mutation.isPending || pendingKey) return
    setPendingKey(key)
    mutation.mutate(key)
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">أيقونة التطبيق</h1>
          <p className="text-sm text-muted-foreground mt-1">
            اختر أيقونة التطبيق على جوال العميل. كل التغييرات تُعرض للعميل
            مع نافذة تأكيد من نظام iOS قبل التفعيل.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          جاري التحميل...
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-red-500">
          تعذّر تحميل الإعدادات
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.variants.map((variant) => (
              <IconCard
                key={variant.key}
                variant={variant}
                pending={pendingKey === variant.key}
                disabled={mutation.isPending && pendingKey !== variant.key}
                onActivate={() => handleActivate(variant.key)}
              />
            ))}
          </div>

          {/* Usage notes */}
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5 space-y-3 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <span>ℹ️</span>
              ملاحظات مهمة
            </div>
            <ul className="list-disc ps-5 space-y-1.5 text-muted-foreground">
              <li>
                التغيير يظهر لعملاء التطبيق عند فتح التطبيق التالي.
              </li>
              <li>
                iOS يعرض نافذة تأكيد: <strong>"Stamply icon has changed"</strong>{' '}
                — العميل يجب أن يوافق يدوياً.
              </li>
              <li>
                إذا رفض العميل، الأيقونة تبقى على الوضع السابق، ويمكنه
                التبديل يدوياً من إعدادات التطبيق.
              </li>
              <li>
                كل الأيقونات محمّلة مسبقاً داخل التطبيق — التبديل فوري
                بدون تحديث من App Store.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────

function IconCard({
  variant,
  pending,
  disabled,
  onActivate,
}: {
  variant: AppIconVariant
  pending: boolean
  disabled: boolean
  onActivate: () => void
}) {
  const { is_active, label_ar, is_default, key } = variant

  return (
    <div
      className={`rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-all ${
        is_active
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-border/80'
      }`}
    >
      {/* Icon preview */}
      <div className="relative">
        <div className="w-20 h-20 rounded-[22%] overflow-hidden shadow-sm bg-gray-100">
          <img
            src={`/app-icon-previews/${PREVIEW_FILE[key]}`}
            alt={label_ar}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {is_active ? (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow">
            <Check className="w-4 h-4" strokeWidth={3} />
          </div>
        ) : null}
      </div>

      {/* Label */}
      <div className="text-center min-h-[40px]">
        <div className="text-sm font-bold text-foreground">{label_ar}</div>
        {is_default ? (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            الافتراضية
          </div>
        ) : null}
      </div>

      {/* Action */}
      {is_active ? (
        <div className="w-full rounded-lg bg-primary/10 py-1.5 text-xs font-semibold text-primary text-center">
          مفعّلة حالياً
        </div>
      ) : (
        <button
          type="button"
          onClick={onActivate}
          disabled={pending || disabled}
          className="w-full rounded-lg bg-primary text-white py-1.5 text-xs font-semibold disabled:opacity-50 hover:bg-primary/90 transition"
        >
          {pending ? 'جاري التفعيل...' : 'تفعيل'}
        </button>
      )}
    </div>
  )
}

/**
 * Maps a variant key to its preview filename in /public/app-icon-previews/.
 * Note: `national_day` uses a hyphenated filename to match the mobile
 * assets folder convention (iOS alternate icons cannot contain underscores).
 */
const PREVIEW_FILE: Record<AppIconVariantKey, string> = {
  default: 'default.png',
  white: 'white.png',
  ramadan: 'ramadan.png',
  eid: 'eid.png',
  national_day: 'national-day.png',
}
