import { useState, type FormEvent } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Apple,
  KeyRound,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Globe,
  Smartphone as DeviceIcon,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/ui/back-button'
import {
  getPlatformWalletSettings,
  updatePlatformAppleWallet,
  type PlatformWalletSettings,
} from '@/lib/api/op/settings'

export default function OpSettingsAppleWalletPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['op-settings', 'wallet'],
    queryFn: getPlatformWalletSettings,
  })

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3500)
  }

  if (isLoading || !data) {
    return <FullPageLoader />
  }

  return (
    <div className="max-w-3xl">
      <BackButton href="/op/settings" />
      <h1 className="text-2xl font-bold mb-6">Apple Wallet</h1>

      {msg && (
        <div
          className={`rounded-lg border p-3 text-sm flex items-center gap-2 mb-6 ${
            msg.ok
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
              : 'border-destructive/40 bg-destructive/10 text-destructive'
          }`}
        >
          {msg.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <AppleWalletForm apple={data.apple} flash={flash} qc={qc} />
    </div>
  )
}

function AppleWalletForm({
  apple,
  flash,
  qc,
}: {
  apple: PlatformWalletSettings['apple']
  flash: (ok: boolean, text: string) => void
  qc: ReturnType<typeof useQueryClient>
}) {
  const [form, setForm] = useState({
    pass_type_id: apple.pass_type_id,
    team_id: apple.team_id,
    organization_name: apple.organization_name,
    cert_pem: '',
    key_pem: '',
    key_password: '',
    wwdr_cert_pem: '',
    use_sandbox: apple.use_sandbox,
  })

  const saveMutation = useMutation({
    mutationFn: () => updatePlatformAppleWallet(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-settings', 'wallet'] })
      flash(true, 'تم حفظ شهادات Apple Wallet')
      setForm((f) => ({
        ...f,
        cert_pem: '',
        key_pem: '',
        key_password: '',
        wwdr_cert_pem: '',
      }))
    },
    onError: () => flash(false, 'تعذر حفظ شهادات Apple Wallet'),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const chips: Array<{
    label: string
    state: 'ok' | 'warn' | 'bad'
    hint?: string
  }> = []
  if (apple.has_cert) {
    chips.push({ label: 'الشهادة محفوظة', state: 'ok' })
  } else {
    chips.push({ label: 'لا توجد شهادة', state: 'bad' })
  }
  if (apple.cert_info) {
    chips.push({
      label:
        apple.cert_info.is_expired
          ? `منتهية منذ ${Math.abs(apple.cert_info.days_until_expiry ?? 0)} يوم`
          : `سارية ${apple.cert_info.days_until_expiry ?? '?'} يوم`,
      state: apple.cert_info.is_expired
        ? 'bad'
        : (apple.cert_info.days_until_expiry ?? 0) < 30
          ? 'warn'
          : 'ok',
    })
    chips.push({
      label: apple.cert_info.is_apple_issued
        ? 'موقّعة من Apple WWDR'
        : 'غير موقّعة من Apple',
      state: apple.cert_info.is_apple_issued ? 'ok' : 'warn',
      hint: apple.cert_info.is_apple_issued
        ? undefined
        : 'الشهادة موقّعة ذاتياً — لن تُثبَّت على iPhone حقيقي',
    })
    chips.push({
      label: apple.cert_info.key_matches_cert
        ? 'المفتاح يطابق الشهادة'
        : 'المفتاح لا يطابق الشهادة',
      state: apple.cert_info.key_matches_cert ? 'ok' : 'bad',
    })
  }
  chips.push({
    label: apple.app_url_is_https ? 'APP_URL يستخدم HTTPS' : 'APP_URL ليس HTTPS',
    state: apple.app_url_is_https ? 'ok' : 'warn',
    hint: apple.app_url_is_https
      ? undefined
      : 'iOS لن يطلب تحديث البطاقة إلا عبر HTTPS',
  })
  chips.push({
    label: apple.auto_update_enabled
      ? 'التحديث التلقائي مُفعَّل'
      : 'التحديث التلقائي معطّل',
    state: apple.auto_update_enabled ? 'ok' : 'warn',
  })
  if (apple.is_development) {
    chips.push({
      label: 'وضع التطوير — APNs مُعطَّل',
      state: 'warn',
      hint: 'تم استخدام wallet:seed-dev — استبدل بشهادة حقيقية',
    })
  }

  const daysLeft = apple.cert_info?.days_until_expiry ?? null
  const expiryDate = apple.cert_info?.expires_at
    ? new Date(apple.cert_info.expires_at * 1000)
    : null
  const expiryFormatted = expiryDate
    ? expiryDate.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null
  let expiryLevel: 'expired' | 'critical' | 'warning' | 'ok' | null = null
  if (apple.cert_info) {
    if (apple.cert_info.is_expired) expiryLevel = 'expired'
    else if (daysLeft !== null && daysLeft <= 14) expiryLevel = 'critical'
    else if (daysLeft !== null && daysLeft <= 60) expiryLevel = 'warning'
    else expiryLevel = 'ok'
  }

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
          <Apple className="w-5 h-5 text-neutral-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">Apple Wallet — شهادات توقيع البطاقات</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            تحتاج Apple Developer Program ($99/سنة) لإنشاء Pass Type ID
            وتصدير شهادة التوقيع. بعد ذلك تحوّلها إلى PEM عبر{' '}
            <code className="bg-muted px-1 rounded font-mono" dir="ltr">
              openssl pkcs12 -in pass.p12 -out pass.pem -nodes
            </code>
            .
          </p>
        </div>
      </div>

      {expiryLevel && expiryDate && (
        <div
          className={`rounded-lg border-2 p-4 mb-5 flex items-start gap-3 ${
            expiryLevel === 'expired' || expiryLevel === 'critical'
              ? 'border-rose-300 bg-rose-50'
              : expiryLevel === 'warning'
                ? 'border-amber-300 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              expiryLevel === 'expired' || expiryLevel === 'critical'
                ? 'bg-rose-100 text-rose-700'
                : expiryLevel === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {expiryLevel === 'expired' || expiryLevel === 'critical' ? (
              <AlertCircle className="w-5 h-5" />
            ) : expiryLevel === 'warning' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className={`text-sm font-bold ${
                expiryLevel === 'expired' || expiryLevel === 'critical'
                  ? 'text-rose-900'
                  : expiryLevel === 'warning'
                    ? 'text-amber-900'
                    : 'text-emerald-900'
              }`}
            >
              {expiryLevel === 'expired'
                ? 'الشهادة منتهية الصلاحية'
                : expiryLevel === 'critical'
                  ? 'الشهادة على وشك الانتهاء'
                  : expiryLevel === 'warning'
                    ? 'الشهادة تنتهي قريباً'
                    : 'الشهادة سارية'}
            </div>
            <div
              className={`text-xs mt-1 leading-relaxed ${
                expiryLevel === 'expired' || expiryLevel === 'critical'
                  ? 'text-rose-800'
                  : expiryLevel === 'warning'
                    ? 'text-amber-800'
                    : 'text-emerald-800'
              }`}
            >
              <strong>تاريخ الانتهاء:</strong> {expiryFormatted}
              {daysLeft !== null && (
                <>
                  {' · '}
                  <strong>
                    {expiryLevel === 'expired'
                      ? `منتهية منذ ${Math.abs(daysLeft)} يوم`
                      : `بعد ${daysLeft} يوم`}
                  </strong>
                </>
              )}
            </div>
            {(expiryLevel === 'expired' || expiryLevel === 'critical') && (
              <div className="text-[11px] mt-2 text-rose-900 leading-relaxed">
                ستتوقّف بطاقات Apple Wallet عن التثبيت والتحديث فور انتهاء
                الشهادة. جدّد شهادة Pass Type ID من{' '}
                <a
                  href="https://developer.apple.com/account/resources/certificates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                  dir="ltr"
                >
                  Apple Developer
                </a>{' '}
                وأعد رفعها هنا.
              </div>
            )}
            {expiryLevel === 'warning' && (
              <div className="text-[11px] mt-2 text-amber-900 leading-relaxed">
                نوصي بتجديد الشهادة مبكراً قبل انتهائها لتجنّب انقطاع الخدمة.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-4 mb-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {apple.auto_update_enabled && apple.cert_info?.is_apple_issued ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          )}
          <span>حالة الإعدادات</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <span
              key={i}
              title={chip.hint}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                chip.state === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : chip.state === 'warn'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {chip.state === 'ok' ? (
                <Check className="w-3 h-3" />
              ) : chip.state === 'warn' ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {chip.label}
            </span>
          ))}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] pt-2 border-t border-border/50">
          {apple.cert_info?.subject_uid && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Pass Type ID المحفوظ:</span>
              <code className="font-mono text-foreground" dir="ltr">
                {apple.cert_info.subject_uid}
              </code>
            </div>
          )}
          {apple.cert_info?.subject_ou && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Team ID المحفوظ:</span>
              <code className="font-mono text-foreground" dir="ltr">
                {apple.cert_info.subject_ou}
              </code>
            </div>
          )}
          {apple.cert_info?.expires_at ? (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">تنتهي:</span>
              <span className="text-foreground">
                {new Date(apple.cert_info.expires_at * 1000).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory')}
              </span>
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            <DeviceIcon className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">أجهزة مسجّلة للتحديث:</span>
            <span className="text-foreground font-semibold">
              {apple.installed_devices_count}
            </span>
          </div>
          <div className="flex items-center gap-1.5 col-span-full">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">APP_URL:</span>
            <code className="font-mono text-foreground text-[10px] truncate" dir="ltr">
              {apple.app_url || '(غير مضبوط)'}
            </code>
          </div>
        </dl>

        {!apple.app_url_is_https && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 leading-relaxed">
            <strong className="font-semibold">تنبيه:</strong> APP_URL ليس HTTPS، لذلك
            iOS لن يستفسر عن تحديثات البطاقة. للاختبار المحلي استخدم{' '}
            <code className="bg-amber-100 px-1 rounded font-mono" dir="ltr">
              ngrok http 8000
            </code>{' '}
            ثم حدّث <code className="font-mono">APP_URL</code> في{' '}
            <code className="font-mono">.env</code> إلى رابط HTTPS الذي يعطيه ngrok.
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="apple-pass-type" className="text-xs text-muted-foreground">
              Pass Type ID
            </Label>
            <Input
              id="apple-pass-type"
              value={form.pass_type_id}
              onChange={(e) => setForm({ ...form, pass_type_id: e.target.value })}
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="pass.com.stamply.loyalty"
            />
          </div>
          <div>
            <Label htmlFor="apple-team-id" className="text-xs text-muted-foreground">
              Team ID
            </Label>
            <Input
              id="apple-team-id"
              value={form.team_id}
              onChange={(e) => setForm({ ...form, team_id: e.target.value })}
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="ABC1234567"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="apple-org-name" className="text-xs text-muted-foreground">
            اسم المؤسسة (يظهر على البطاقة كـ "Organization")
          </Label>
          <Input
            id="apple-org-name"
            value={form.organization_name}
            onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
            className="mt-1"
            placeholder="Stamply"
          />
        </div>

        <div>
          <Label htmlFor="apple-cert" className="text-xs text-muted-foreground">
            Pass Signing Certificate (PEM)
            {apple.has_cert && (
              <span className="text-[10px] text-emerald-600 ms-2">✓ محفوظة</span>
            )}
          </Label>
          <Textarea
            id="apple-cert"
            value={form.cert_pem}
            onChange={(e) => setForm({ ...form, cert_pem: e.target.value })}
            dir="ltr"
            rows={5}
            className="mt-1 font-mono text-[10px]"
            placeholder={
              apple.has_cert
                ? '(محفوظة — اتركها فارغة للاحتفاظ بها)'
                : '-----BEGIN CERTIFICATE-----\nMIIFw...\n-----END CERTIFICATE-----'
            }
          />
        </div>

        <div>
          <Label htmlFor="apple-key" className="text-xs text-muted-foreground">
            Private Key (PEM)
            {apple.has_key && (
              <span className="text-[10px] text-emerald-600 ms-2">✓ محفوظ</span>
            )}
          </Label>
          <Textarea
            id="apple-key"
            value={form.key_pem}
            onChange={(e) => setForm({ ...form, key_pem: e.target.value })}
            dir="ltr"
            rows={5}
            className="mt-1 font-mono text-[10px]"
            placeholder={
              apple.has_key
                ? '(محفوظ — اتركه فارغاً للاحتفاظ به)'
                : '-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----'
            }
          />
        </div>

        <div>
          <Label htmlFor="apple-key-pw" className="text-xs text-muted-foreground">
            كلمة مرور المفتاح (اختياري)
            {apple.has_key_password && (
              <span className="text-[10px] text-emerald-600 ms-2">✓ محفوظة</span>
            )}
          </Label>
          <Input
            id="apple-key-pw"
            type="password"
            value={form.key_password}
            onChange={(e) => setForm({ ...form, key_password: e.target.value })}
            dir="ltr"
            className="mt-1 font-mono text-xs"
            placeholder={apple.has_key_password ? '••••••••' : ''}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            إذا كان الـ .p12 مُصدَّراً بدون كلمة مرور، اتركها فارغة.
          </p>
        </div>

        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            شهادة Apple WWDR Intermediate (اختيارية — متقدّم)
          </summary>
          <div className="mt-3">
            <Textarea
              value={form.wwdr_cert_pem}
              onChange={(e) => setForm({ ...form, wwdr_cert_pem: e.target.value })}
              dir="ltr"
              rows={4}
              className="font-mono text-[10px]"
              placeholder={
                apple.has_wwdr_cert
                  ? '(محفوظة — المكتبة ستستخدم النسخة المضمّنة افتراضياً)'
                  : 'يمكن تركها فارغة — مكتبة PassKit تضمّن النسخة الحالية من Apple'
              }
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              تُستخدم فقط إذا Apple حدّثت شهادتها الوسيطة وأردت تجاوز النسخة المضمّنة في المكتبة.
            </p>
          </div>
        </details>

        <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
          <input
            id="apple-use-sandbox"
            type="checkbox"
            checked={form.use_sandbox}
            onChange={(e) => setForm({ ...form, use_sandbox: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <div className="flex-1 min-w-0">
            <Label
              htmlFor="apple-use-sandbox"
              className="text-xs font-medium cursor-pointer"
            >
              استخدم APNs Sandbox بدلاً من الإنتاج
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              ابقها معطّلة في الإنتاج. فعّلها فقط عند تشخيص push notifications على
              <code className="bg-muted px-1 rounded font-mono mx-1" dir="ltr">
                api.sandbox.push.apple.com
              </code>
              .
            </p>
          </div>
        </div>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin me-1.5" />
          ) : (
            <KeyRound className="w-4 h-4 me-1.5" />
          )}
          حفظ شهادات Apple Wallet
        </Button>
      </form>
    </section>
  )
}
