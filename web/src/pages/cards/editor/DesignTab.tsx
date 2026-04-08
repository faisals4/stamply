import { useRef, useState } from 'react'
import { Upload, X, ImagePlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { CardDesign } from '@/types/card'
import { DEFAULT_LABELS } from '@/types/card'
import { STAMP_ICONS, CATEGORY_LABELS, isCustomIcon, type StampIconOption } from './stampIcons'

interface Props {
  value: CardDesign
  onChange: (design: CardDesign) => void
}

const MAX_CUSTOM_ICON_BYTES = 3 * 1024 * 1024 // 3 MB
const MIN_CUSTOM_ICON_SIZE = 200 // 200 × 200 px minimum


/**
 * Per-field character limits derived from Apple Wallet's practical
 * truncation thresholds. Apple does not publish hard limits, but the
 * width of each field on a real iPhone screen makes longer values get
 * cut with an ellipsis. These numbers are the consensus across the
 * passkit community.
 *
 * Both Arabic and English variants share the same limit because the
 * physical column width is identical regardless of script.
 */
const LABEL_LIMITS = {
  /** Header bar title — sits next to the logo, ~½ of the pass width. */
  title: 24,
  /** Stamps label — header field, very narrow. */
  stamps: 12,
  /** Reward label — also reused as the GIFT counter label opposite the
   *  logo (single source of truth so the tenant only types it once). */
  reward: 15,
  customer: 15,
} as const

const COLOR_PRESETS = [
  { bg: '#FEF3C7', fg: '#78350F', stampsBg: '#FCD34D', active: '#78350F', inactive: '#FDE68A', label: 'ذهبي' },
  { bg: '#FCE7F3', fg: '#831843', stampsBg: '#F9A8D4', active: '#831843', inactive: '#FBCFE8', label: 'وردي' },
  { bg: '#DBEAFE', fg: '#1E3A8A', stampsBg: '#93C5FD', active: '#1E3A8A', inactive: '#BFDBFE', label: 'أزرق' },
  { bg: '#D1FAE5', fg: '#064E3B', stampsBg: '#6EE7B7', active: '#064E3B', inactive: '#A7F3D0', label: 'أخضر' },
  { bg: '#FEE2E2', fg: '#7F1D1D', stampsBg: '#FCA5A5', active: '#7F1D1D', inactive: '#FECACA', label: 'أحمر' },
  { bg: '#E9D5FF', fg: '#581C87', stampsBg: '#C4B5FD', active: '#581C87', inactive: '#DDD6FE', label: 'بنفسجي' },
  { bg: '#1F2937', fg: '#F9FAFB', stampsBg: '#374151', active: '#FCD34D', inactive: '#4B5563', label: 'داكن' },
  { bg: '#FFFFFF', fg: '#111827', stampsBg: '#F3F4F6', active: '#111827', inactive: '#E5E7EB', label: 'فاتح' },
]

// Group icons by category for a tidy picker
const GROUPED_ICONS = STAMP_ICONS.reduce<Record<StampIconOption['category'], StampIconOption[]>>(
  (acc, icon) => {
    if (!acc[icon.category]) acc[icon.category] = []
    acc[icon.category].push(icon)
    return acc
  },
  {} as Record<StampIconOption['category'], StampIconOption[]>,
)

export function DesignTab({ value, onChange }: Props) {
  const update = (patch: Partial<CardDesign>) => onChange({ ...value, ...patch })
  const updateColors = (patch: Partial<CardDesign['colors']>) =>
    update({ colors: { ...value.colors, ...patch } })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">تصميم</h2>

        {/* Stamps count */}
        <div className="space-y-2">
          <Label>عدد الطوابع</Label>
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update({ stampsCount: n })}
                className={cn(
                  'h-9 text-sm rounded-md border transition',
                  value.stampsCount === n
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-background hover:border-primary/40',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            العدد الكلي للطوابع قبل المكافأة. حالياً: <strong>{value.stampsCount}</strong>
          </p>
        </div>
      </div>

      <Separator />

      {/* Stamp icon — categorized grid + upload */}
      <StampIconPicker value={value} update={update} />

      <Separator />

      {/* Per-card brand logo override (optional) */}
      <BrandLogoPicker value={value} update={update} />

      <Separator />

      {/* Custom labels */}
      <CardLabelsEditor value={value} update={update} />

      <Separator />

      {/* Color presets */}
      <div>
        <h3 className="font-semibold mb-3">الألوان</h3>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {COLOR_PRESETS.map((p) => {
            const isActive = value.colors.background === p.bg
            return (
              <button
                key={p.label}
                type="button"
                onClick={() =>
                  updateColors({
                    background: p.bg,
                    foreground: p.fg,
                    stampsBackground: p.stampsBg,
                    activeStamp: p.active,
                    inactiveStamp: p.inactive,
                  })
                }
                className={cn(
                  'rounded-lg border-2 p-2 transition',
                  isActive ? 'border-primary' : 'border-border hover:border-primary/40',
                )}
              >
                <div
                  className="h-10 rounded flex items-center justify-center"
                  style={{ background: p.bg }}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2"
                    style={{ borderColor: p.active }}
                  />
                </div>
                <div className="text-xs mt-1.5 text-muted-foreground">{p.label}</div>
              </button>
            )
          })}
        </div>

        {/* Fine-grained color pickers */}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            ألوان مخصصة ←
          </summary>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <ColorInput
              label="خلفية البطاقة"
              value={value.colors.background}
              onChange={(c) => updateColors({ background: c })}
            />
            <ColorInput
              label="لون النص"
              value={value.colors.foreground}
              onChange={(c) => updateColors({ foreground: c })}
            />
            <ColorInput
              label="خلفية الطوابع"
              value={value.colors.stampsBackground}
              onChange={(c) => updateColors({ stampsBackground: c })}
            />
            <ColorInput
              label="ختم نشط"
              value={value.colors.activeStamp}
              onChange={(c) => updateColors({ activeStamp: c })}
            />
            <ColorInput
              label="ختم غير نشط"
              value={value.colors.inactiveStamp}
              onChange={(c) => updateColors({ inactiveStamp: c })}
            />
          </div>
        </details>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */

function StampIconPicker({
  value,
  update,
}: {
  value: CardDesign
  update: (patch: Partial<CardDesign>) => void
}) {
  const [error, setError] = useState<string | null>(null)

  // We treat the icon as "custom" if EITHER slot is a data URL — that's
  // how the user knows the picker is in upload mode for at least one of
  // the two states.
  const isCustomActive = isCustomIcon(value.activeStampIcon)
  const isCustomInactive = isCustomIcon(value.inactiveStampIcon)
  const isAnyCustom = isCustomActive || isCustomInactive

  const selectBuiltin = (iconName: string) => {
    setError(null)
    // Selecting from the built-in library always sets BOTH slots — the
    // tenant picks one Lucide icon and uses it for collected + remaining.
    // The active vs inactive distinction comes from color + opacity in
    // the renderer, not from a different glyph.
    update({ activeStampIcon: iconName, inactiveStampIcon: iconName })
  }

  /** Validate a PNG file then call `onValid` with the data URL. */
  const validateAndRead = (file: File, onValid: (dataUrl: string) => void) => {
    setError(null)
    if (file.type !== 'image/png') {
      setError('الملف يجب أن يكون PNG فقط')
      return
    }
    if (file.size > MAX_CUSTOM_ICON_BYTES) {
      setError('حجم الملف أكبر من 3 ميجابايت')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const img = new Image()
      img.onload = () => {
        if (img.width < MIN_CUSTOM_ICON_SIZE || img.height < MIN_CUSTOM_ICON_SIZE) {
          setError(`الحد الأدنى ${MIN_CUSTOM_ICON_SIZE}×${MIN_CUSTOM_ICON_SIZE} بكسل`)
          return
        }
        onValid(dataUrl)
      }
      img.onerror = () => setError('تعذر قراءة الصورة')
      img.src = dataUrl
    }
    reader.onerror = () => setError('فشل في قراءة الملف')
    reader.readAsDataURL(file)
  }

  const setActive = (file: File) =>
    validateAndRead(file, (url) => update({ activeStampIcon: url }))
  const setInactive = (file: File) =>
    validateAndRead(file, (url) => update({ inactiveStampIcon: url }))

  const removeActive = () => {
    update({ activeStampIcon: 'Coffee' })
    setError(null)
  }
  const removeInactive = () => {
    update({ inactiveStampIcon: 'Coffee' })
    setError(null)
  }

  return (
    <div>
      <h3 className="font-semibold mb-1">أيقونة الختم</h3>
      <p className="text-sm text-muted-foreground mb-4">
        اختر من المكتبة، أو ارفع صورتين منفصلتين: واحدة للأختام المُجمّعة وواحدة للفارغة
      </p>

      {/* Two side-by-side custom uploaders — one for collected (active),
          one for remaining (inactive). The tenant can mix and match: e.g.
          a coloured cup icon for collected and a faded cup outline for
          remaining. Each slot has its own preview, replace and remove. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <CustomIconSlot
          title="الختم المُجمَّع"
          subtitle="يظهر للأختام التي حصل عليها العميل"
          iconValue={value.activeStampIcon}
          isCustom={isCustomActive}
          onPick={setActive}
          onRemove={removeActive}
        />
        <CustomIconSlot
          title="الختم الفارغ"
          subtitle="يظهر للأختام التي لم يحصل عليها بعد"
          iconValue={value.inactiveStampIcon}
          isCustom={isCustomInactive}
          onPick={setInactive}
          onRemove={removeInactive}
        />
      </div>

      <p className="text-[11px] text-muted-foreground mb-4">
        PNG فقط، الحد الأقصى 3MB، الحد الأدنى 200×200 بكسل لكل صورة
      </p>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="text-xs font-medium text-muted-foreground mb-2">
        أو اختر من المكتبة:
      </div>

      {/* Built-in icons grouped by category */}
      <div className="space-y-4">
        {(Object.keys(GROUPED_ICONS) as StampIconOption['category'][]).map((cat) => (
          <div key={cat}>
            <div className="text-xs text-muted-foreground mb-2">
              {CATEGORY_LABELS[cat]}
            </div>
            <div className="grid grid-cols-8 gap-2">
              {GROUPED_ICONS[cat].map(({ name, Icon, label }) => {
                const isSelected = !isAnyCustom && value.activeStampIcon === name
                return (
                  <button
                    key={name}
                    type="button"
                    title={label}
                    onClick={() => selectBuiltin(name)}
                    className={cn(
                      'aspect-square rounded-lg border-2 flex items-center justify-center transition',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */

/**
 * One slot of the dual stamp-icon uploader. Renders a preview tile
 * (with the current icon — Lucide or custom) above an upload/replace
 * button. The parent owns the validation + state; this component is
 * dumb on purpose so it can be used twice without prop drilling.
 */
function CustomIconSlot({
  title,
  subtitle,
  iconValue,
  isCustom,
  onPick,
  onRemove,
}: {
  title: string
  subtitle: string
  iconValue: string
  isCustom: boolean
  onPick: (file: File) => void
  onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onPick(file)
    e.target.value = ''
  }

  // Lookup the Lucide icon for preview when the slot isn't custom.
  const builtinOption = !isCustom
    ? STAMP_ICONS.find((o) => o.name === iconValue)
    : null

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-lg bg-muted/50 border flex items-center justify-center shrink-0 p-1.5">
          {isCustom ? (
            <img
              src={iconValue}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
          ) : builtinOption ? (
            <builtinOption.Icon className="w-7 h-7 text-foreground" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-muted-foreground leading-tight">{subtitle}</div>
        </div>
        {isCustom && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive p-1.5 shrink-0"
            aria-label="إزالة"
            title="إزالة"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png"
        className="sr-only"
        onChange={onInputChange}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={cn(
          'w-full rounded-lg border-2 border-dashed px-3 py-2 text-xs transition flex items-center justify-center gap-1.5',
          'hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-foreground',
        )}
      >
        {isCustom ? <ImagePlus className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
        {isCustom ? 'استبدال' : 'رفع PNG'}
      </button>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */

/**
 * Per-card brand logo override.
 *
 * The default logo for every Apple/Google Wallet pass and the in-app
 * card visual is the BRAND logo set once in /admin/settings →
 * "معلومات النشاط التجاري". This component lets a tenant override
 * that for a specific card — useful for seasonal cards (e.g. an Eid
 * special card with its own holiday lockup) or co-branded cards.
 *
 * When the per-card slot is empty, the renderers fall back to the
 * brand logo automatically. Removing the per-card override
 * immediately restores the brand default — there's no need to
 * re-upload the brand logo per card.
 *
 * Storage: `design.logoUrl` (base64 data URL inside the design JSON).
 * Apple Wallet pkpass logic mirrors this priority in
 * `ApplePassBuilder.php`: per-card override → brand → bundled default.
 */
function BrandLogoPicker({
  value,
  update,
}: {
  value: CardDesign
  update: (patch: Partial<CardDesign>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (file: File) => {
    setError(null)
    if (
      !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(
        file.type,
      )
    ) {
      setError('PNG أو JPG أو WebP أو SVG فقط')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الملف أكبر من 2 ميجابايت')
      return
    }
    const reader = new FileReader()
    reader.onload = () => update({ logoUrl: String(reader.result) })
    reader.onerror = () => setError('فشل في قراءة الملف')
    reader.readAsDataURL(file)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const remove = () => {
    update({ logoUrl: undefined })
    setError(null)
  }

  const hasOverride = !!value.logoUrl

  return (
    <div>
      <h3 className="font-semibold mb-1">شعار البطاقة</h3>
      <p className="text-sm text-muted-foreground mb-4">
        ارفع شعاراً خاصاً بهذه البطاقة. إذا تركته فارغاً، يُستخدم شعار
        النشاط من{' '}
        <a
          href="/admin/settings"
          className="text-primary hover:underline"
        >
          إعدادات النشاط التجاري
        </a>{' '}
        تلقائياً.
      </p>

      {hasOverride && (
        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 mb-3">
          <div className="flex items-center gap-4">
            <div className="w-20 h-12 rounded-lg bg-background border flex items-center justify-center shrink-0 p-1">
              <img
                src={value.logoUrl}
                alt="الشعار"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">شعار خاص بالبطاقة</div>
              <div className="text-xs text-muted-foreground">
                يستبدل شعار النشاط لهذه البطاقة فقط
              </div>
            </div>
            <button
              type="button"
              onClick={remove}
              className="text-muted-foreground hover:text-destructive p-2"
              aria-label="إزالة الشعار الخاص"
              title="إزالة (سيعود لشعار النشاط)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={onInputChange}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={cn(
          'w-full rounded-lg border-2 border-dashed px-4 py-3 text-sm transition flex items-center justify-center gap-2',
          'hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-foreground',
        )}
      >
        {hasOverride ? (
          <ImagePlus className="w-4 h-4" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {hasOverride ? 'استبدال الشعار الخاص' : 'رفع شعار خاص بالبطاقة'}
      </button>

      <p className="text-[11px] text-muted-foreground mt-2">
        PNG أو JPG أو WebP أو SVG، الحد الأقصى 2MB. يُفضّل أن تكون الخلفية
        شفافة.
      </p>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */

/**
 * Customisable label editor — stamps / reward / customer × (Arabic +
 * English). Each label has an Arabic input and an English input side
 * by side. The English variant is OPTIONAL: when empty, the Arabic
 * value is used everywhere. When provided, it ships into the Apple
 * Wallet pass as an `en.lproj/pass.strings` localisation, so iPhones
 * set to English see "Stamps" while iPhones set to Arabic see "الطوابع".
 *
 * Per-field maxLength is enforced via {@link LABEL_LIMITS} for both
 * scripts (the column width on a real device is the same regardless).
 */
function CardLabelsEditor({
  value,
  update,
}: {
  value: CardDesign
  update: (patch: Partial<CardDesign>) => void
}) {
  const labels = value.labels ?? {}
  const setLabel = (key: keyof typeof DEFAULT_LABELS, v: string) =>
    update({ labels: { ...labels, [key]: v } })

  // The "اسم البطاقة المعروض" rows that used to live here were
  // removed — the card title now comes from the canonical `card.name`
  // / `design.nameEn` fields edited from the InfoTab. Only the field
  // labels (stamps / reward / customer) are configured here.
  const rows: Array<{
    title: string
    arKey: keyof typeof DEFAULT_LABELS
    enKey: keyof typeof DEFAULT_LABELS
    limit: number
    optional?: boolean
  }> = [
    { title: 'مسمى الأختام', arKey: 'stamps', enKey: 'stampsEn', limit: LABEL_LIMITS.stamps },
    { title: 'مسمى المكافأة', arKey: 'reward', enKey: 'rewardEn', limit: LABEL_LIMITS.reward },
    { title: 'مسمى العميل', arKey: 'customer', enKey: 'customerEn', limit: LABEL_LIMITS.customer },
  ]

  return (
    <div>
      <h3 className="font-semibold mb-1">النصوص</h3>
      <p className="text-sm text-muted-foreground mb-4">
        خصّص مسميات الحقول التي تظهر على البطاقة. النص الإنجليزي اختياري — يظهر تلقائياً للعملاء الذين تكون لغة جهازهم إنجليزية
      </p>

      <div className="space-y-4">
        {rows.map(({ title, arKey, enKey, limit, optional }) => (
          <div key={arKey} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelInputField
              label={`${title} (عربي)${optional ? ' — اختياري' : ''}`}
              placeholder={optional ? 'اتركه فارغاً للإخفاء' : DEFAULT_LABELS[arKey]}
              value={labels[arKey] ?? ''}
              maxLength={limit}
              onChange={(v) => setLabel(arKey, v)}
            />
            <LabelInputField
              label={`${title} (English)${optional ? ' — optional' : ''}`}
              placeholder={optional ? 'Leave empty to hide' : DEFAULT_LABELS[enKey]}
              value={labels[enKey] ?? ''}
              maxLength={limit}
              onChange={(v) => setLabel(enKey, v)}
              dir="ltr"
            />
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        اتركه فارغاً لاستخدام النص الافتراضي. الحد الأقصى لكل مسمى يطابق المساحة المتاحة في محفظة آبل
      </p>
    </div>
  )
}

/**
 * One label input with per-field character counter that flips to a
 * destructive color as the user approaches the limit. Optionally
 * forces LTR direction for the English variants.
 */
function LabelInputField({
  label,
  placeholder,
  value,
  maxLength,
  onChange,
  dir,
}: {
  label: string
  placeholder: string
  value: string
  maxLength: number
  onChange: (v: string) => void
  dir?: 'ltr' | 'rtl'
}) {
  const remaining = maxLength - value.length
  const isNearLimit = remaining <= 3
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span
          className={cn(
            'text-[10px] tabular-nums',
            isNearLimit ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {value.length}/{maxLength}
        </span>
      </div>
      <Input
        type="text"
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (c: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 rounded border border-input cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs font-mono"
          dir="ltr"
        />
      </div>
    </div>
  )
}
