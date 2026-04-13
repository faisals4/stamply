import { useState, type FormEvent } from 'react'
import { useLocation, useRoute } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Loader2 } from 'lucide-react'
import { FullPageLoader } from '@/components/ui/spinner'
import { getPublicTemplate, issueCard } from '@/lib/api/misc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput, makePhoneValue, type PhoneInputValue } from '@/components/ui/phone-input'
import { DEFAULT_COUNTRY_CODE } from '@/lib/utils/countries'
import { CardVisual } from '@/components/card/CardVisual'
import type { CardTemplate, CardReward } from '@/types/card'

/**
 * /c/:templateId — public, unauthenticated page a customer opens from a QR
 * or link. Shows the card preview + a short signup form. On submit, issues
 * the card and redirects to /i/:serial.
 */
export default function PublicRegisterPage() {
  const [, setLocation] = useLocation()
  const [, params] = useRoute('/c/:templateId')
  const templateId = params?.templateId ?? ''

  const { data: template, isLoading, error } = useQuery({
    queryKey: ['public-template', templateId],
    queryFn: () => getPublicTemplate(templateId),
    enabled: !!templateId,
  })

  const [phone, setPhone] = useState<PhoneInputValue>(() =>
    makePhoneValue(DEFAULT_COUNTRY_CODE, ''),
  )
  // Generic state for ALL non-phone fields keyed by field.key
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const setField = (key: string, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!phone.isValid) {
      setServerError('رقم الجوال غير صحيح — تحقق من عدد الأرقام')
      return
    }

    // Map dynamic field values into the API's input shape.
    // The "name" field renders as two side-by-side inputs
    // (first_name + last_name) and is stored as such.
    const firstName = (values.first_name ?? '').trim()
    const lastName = (values.last_name ?? '').trim()

    setSubmitting(true)
    try {
      const utm = new URLSearchParams(window.location.search).get('utm_source') ?? undefined
      const res = await issueCard(templateId, {
        phone: `+${phone.e164}`,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: values.email?.trim() || undefined,
        birthdate: values.birthdate || undefined,
        source_utm: utm ?? 'website',
      })
      setLocation(`/i/${res.serial_number}`)
    } catch (err) {
      if (err instanceof AxiosError) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.errors?.phone?.[0] ||
          'تعذر تسجيل البطاقة. تحقق من رقم الجوال.'
        setServerError(msg)
      } else {
        setServerError('حدث خطأ غير متوقع')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <PublicShell>
        <FullPageLoader />
      </PublicShell>
    )
  }

  if (error || !template) {
    return (
      <PublicShell>
        <div className="text-center py-20">
          <h1 className="text-xl font-semibold mb-2">البطاقة غير متاحة</h1>
          <p className="text-sm text-muted-foreground">
            قد تكون البطاقة غير منشورة أو الرابط غير صحيح.
          </p>
        </div>
      </PublicShell>
    )
  }

  // Multi-card tenant catalog → show a picker instead of a registration form.
  if (template.kind === 'catalog') {
    return (
      <PublicShell>
        <div className="space-y-5">
          <header className="text-center">
            {template.tenant.logo ? (
              <img
                src={template.tenant.logo}
                alt=""
                className="h-14 max-w-[180px] mx-auto object-contain mb-2"
              />
            ) : null}
            <h1 className="text-lg font-bold">{template.tenant.name}</h1>
            {template.tenant.description && (
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                {template.tenant.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-3">
              اختر إحدى بطاقات الولاء لتسجيلها:
            </p>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {template.cards.map((c) => {
              const slug = c.public_slug ?? String(c.id)
              const adapted = {
                name: c.name,
                design: c.design,
                rewards: c.rewards.map(
                  (r): CardReward => ({
                    id: String(r.id),
                    name: r.name,
                    stampsRequired: r.stamps_required,
                  }),
                ),
              } as unknown as CardTemplate
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setLocation(`/c/${slug}`)}
                  className="text-start rounded-2xl border bg-card p-3 hover:border-primary/50 hover:shadow-md transition"
                >
                  <CardVisual card={adapted} collectedStamps={0} showQr={false} />
                  <div className="mt-3 px-2 pb-1">
                    <div className="font-semibold text-sm">{c.name}</div>
                    {c.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {c.description}
                      </div>
                    )}
                    <div className="text-[11px] text-primary font-medium mt-2">
                      سجّل الآن ←
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </PublicShell>
    )
  }

  const welcomeStamps = Number(template.settings.welcomeStamps ?? 0) || 0
  const firstReward = template.rewards[0]

  // Adapt the public API shape to CardVisual's CardTemplate shape.
  const adaptedCard = {
    name: template.name,
    design: template.design,
    rewards: template.rewards.map(
      (r): CardReward => ({
        id: String(r.id),
        name: r.name,
        stampsRequired: r.stamps_required,
      }),
    ),
  } as unknown as CardTemplate

  return (
    <PublicShell>
      <div className="space-y-6">
        {/* Card preview */}
        <CardVisual
          card={adaptedCard}
          collectedStamps={welcomeStamps}
          showQr={false}
        />

        {/* Card name + description — centered, same style as catalog header */}
        <header className="text-center">
          <h1 className="text-lg font-bold">{template.name}</h1>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed whitespace-pre-line">
              {template.description}
            </p>
          )}
        </header>

        {/* Signup form */}
        <div className="bg-card rounded-2xl border p-5">
          <h2 className="font-semibold mb-1">سجّل بطاقتك الرقمية</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {welcomeStamps > 0
              ? `احصل على ${welcomeStamps} طوابع هدية ترحيبية 🎁`
              : 'بدون تطبيق، بدون تحميل — بطاقة في محفظة جوالك'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {(template.settings.registrationFields ?? []).map((field) => {
              if (field.key === 'phone') {
                return (
                  <div key={field.key}>
                    <Label htmlFor="phone">
                      {field.label}
                      {field.required && ' *'}
                    </Label>
                    <PhoneInput
                      id="phone"
                      value={phone}
                      onChange={setPhone}
                      required={field.required}
                      className="mt-1.5"
                    />
                    {phone.national.length > 0 && !phone.isValid && (
                      <p className="text-[11px] text-destructive mt-1">
                        عدد الأرقام غير مطابق لرمز الدولة
                      </p>
                    )}
                  </div>
                )
              }

              // Split the "name" field into first/last name side-by-side
              // — matches how the customer is stored in the backend.
              if (field.key === 'name') {
                return (
                  <div key={field.key} className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="field-first_name">
                        الاسم الأول
                        {field.required && ' *'}
                      </Label>
                      <Input
                        id="field-first_name"
                        type="text"
                        autoComplete="given-name"
                        required={field.required}
                        value={values.first_name ?? ''}
                        onChange={(e) => setField('first_name', e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field-last_name">
                        اسم العائلة
                        {field.required && ' *'}
                      </Label>
                      <Input
                        id="field-last_name"
                        type="text"
                        autoComplete="family-name"
                        required={field.required}
                        value={values.last_name ?? ''}
                        onChange={(e) => setField('last_name', e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )
              }

              const id = `field-${field.key}`
              return (
                <div key={field.key}>
                  <Label htmlFor={id}>
                    {field.label}
                    {field.required && ' *'}
                  </Label>
                  {field.type === 'select' ? (
                    <select
                      id={id}
                      required={field.required}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— اختر —</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={id}
                      type={
                        field.type === 'email'
                          ? 'email'
                          : field.type === 'date'
                            ? 'date'
                            : 'text'
                      }
                      autoComplete={
                        field.type === 'email'
                          ? 'email'
                          : field.key === 'name'
                            ? 'name'
                            : undefined
                      }
                      required={field.required}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="mt-1.5"
                      dir={field.type === 'email' ? 'ltr' : undefined}
                    />
                  )}
                </div>
              )
            })}

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !phone.isValid}
            >
              {submitting ? 'جارٍ الإصدار...' : 'احصل على البطاقة'}
            </Button>
          </form>
        </div>

        {firstReward && (
          <div className="text-center text-xs text-muted-foreground">
            🎁 جمع {firstReward.stamps_required} طوابع واحصل على <strong>{firstReward.name}</strong>
          </div>
        )}
      </div>
    </PublicShell>
  )
}

/** Minimal mobile-first shell for public pages. No sidebar, centered. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-md mx-auto p-4 md:p-6">
        {children}
        <footer className="mt-8 text-center text-[10px] text-muted-foreground">
          Powered by Stamply
        </footer>
      </div>
    </div>
  )
}
