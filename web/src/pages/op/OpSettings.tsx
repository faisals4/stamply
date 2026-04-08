import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Bell,
  KeyRound,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Apple,
  Smartphone,
  Info,
  Copy,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Smartphone as DeviceIcon,
  Settings as SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/ui/page-header'
import {
  getPlatformPushSettings,
  generatePlatformVapid,
  regeneratePlatformVapid,
  updatePlatformVapid,
  updatePlatformApns,
  updatePlatformFcm,
  getPlatformWalletSettings,
  getPlatformFeatures,
  updatePlatformFeatures,
  type PlatformFeatures,
  updatePlatformAppleWallet,
  updatePlatformGoogleWallet,
  type PlatformWalletSettings,
} from '@/lib/api/op/settings'

/**
 * /op/settings — platform-level configuration owned by the SaaS operator.
 *
 * Right now: push notification credentials (VAPID / APNs / FCM). All
 * tenants inherit these automatically unless they explicitly override
 * their own under `tenant.settings.integrations.push`.
 *
 * Adding more sections later (wallet certs, billing provider, etc.) is
 * just a matter of adding another panel to this page.
 */
export default function OpSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['op-settings', 'push'],
    queryFn: getPlatformPushSettings,
  })

  const { data: walletData } = useQuery({
    queryKey: ['op-settings', 'wallet'],
    queryFn: getPlatformWalletSettings,
  })

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const generateMutation = useMutation({
    mutationFn: generatePlatformVapid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-settings', 'push'] })
      flash(true, 'تم توليد مفاتيح VAPID للمنصّة')
    },
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'تعذر التوليد'),
  })

  const regenerateMutation = useMutation({
    mutationFn: regeneratePlatformVapid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-settings', 'push'] })
      flash(
        true,
        'تم توليد مفاتيح جديدة — كل الاشتراكات السابقة حُذفت',
      )
    },
    onError: () => flash(false, 'تعذر إعادة التوليد'),
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin me-2" />
        جارٍ التحميل...
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        icon={<SettingsIcon />}
        title="إعدادات المنصّة"
        subtitle="الاعتمادات الأساسية التي تُستخدم لكل التجار في Stamply"
      />

      {/* Flash message */}
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

      {/* Info banner */}
      <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-4 mb-6 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-semibold mb-1">كل التجار يستخدمون هذه المفاتيح افتراضياً</p>
          <p>
            عندما يُفعّل أي تاجر التنبيهات أو يتعامل مع بطاقات Apple/Google Wallet،
            يستخدم هذه الاعتمادات تلقائياً بدون أي إعداد من طرفه. التجار
            على خطة Enterprise يمكنهم استبدالها بمفاتيحهم الخاصة من
            `/admin/settings/integrations/push`.
          </p>
        </div>
      </div>

      {/* VAPID section */}
      <section className="rounded-xl border bg-card p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold">Web Push (VAPID)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              مفاتيح موحّدة لكل التنبيهات التي تُرسَل عبر متصفحات العملاء. يُنشَؤها
              Stamply مرة واحدة ولا يحتاج التاجر أي إعداد.
            </p>
          </div>
        </div>

        {data.vapid.public_key ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Public Key</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  value={data.vapid.public_key}
                  readOnly
                  dir="ltr"
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(data.vapid.public_key)
                    flash(true, 'تم النسخ')
                  }}
                  title="نسخ"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Private Key</Label>
              <Input
                value={data.vapid.private_key_masked}
                readOnly
                dir="ltr"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                مقنّع لأسباب أمنية. لا تشاركه مع أحد.
              </p>
            </div>

            <VapidSubjectEditor
              current={data.vapid.subject}
              onSaved={(text) => flash(true, text)}
              onError={(text) => flash(false, text)}
              onSuccess={() => qc.invalidateQueries({ queryKey: ['op-settings', 'push'] })}
            />

            <div className="border-t pt-4 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (
                    confirm(
                      '⚠ سيتم حذف جميع اشتراكات التنبيهات الموجودة — كل العملاء سيحتاجون إعادة التسجيل. هل أنت متأكد؟',
                    )
                  ) {
                    regenerateMutation.mutate()
                  }
                }}
                disabled={regenerateMutation.isPending}
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                {regenerateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                ) : (
                  <RefreshCw className="w-4 h-4 me-1.5" />
                )}
                إعادة توليد المفاتيح
              </Button>
              <p className="text-[11px] text-muted-foreground">
                فقط في حالة اختراق الـ private key
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              لا توجد مفاتيح VAPID بعد. اضغط للتوليد — عملية لمرة واحدة.
            </p>
            <Button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
              ) : (
                <Sparkles className="w-4 h-4 me-1.5" />
              )}
              توليد مفاتيح VAPID
            </Button>
          </div>
        )}
      </section>

      {/* APNs section — collapsed, for future native iOS push */}
      <ApnsSection
        apns={data.apns}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['op-settings', 'push'] })
          flash(true, 'تم حفظ إعدادات APNs')
        }}
        onError={(text) => flash(false, text)}
      />

      {/* FCM section */}
      <FcmSection
        fcm={data.fcm}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['op-settings', 'push'] })
          flash(true, 'تم حفظ إعدادات FCM')
        }}
        onError={(text) => flash(false, text)}
      />

      {/* ────────────────────────────────────────────────────────── */}
      {/*  Wallet section header                                      */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mt-10 mb-4">
        <Wallet className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">محافظ الجوال (Apple + Google Wallet)</h2>
      </div>
      <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-4 mb-6 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-semibold mb-1">شهادات موحّدة لكل التجار</p>
          <p>
            كل بطاقات الولاء التي يُصدرها التجار ستُوقَّع بهذه الشهادات.
            التاجر نفسه لا يحتاج أي شهادة Apple — يستخدم شهادة Stamply
            تلقائياً، وتعرض البطاقة شعار وألوان التاجر مع "signed by Stamply"
            في خانة الإصدار.
          </p>
        </div>
      </div>

      {walletData && (
        <>
          <AppleWalletSection
            apple={walletData.apple}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['op-settings', 'wallet'] })
              flash(true, 'تم حفظ شهادات Apple Wallet')
            }}
            onError={(text) => flash(false, text)}
          />
          <GoogleWalletSection
            google={walletData.google}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['op-settings', 'wallet'] })
              flash(true, 'تم حفظ إعدادات Google Wallet')
            }}
            onError={(text) => flash(false, text)}
          />
        </>
      )}
    </div>
  )
}

function VapidSubjectEditor({
  current,
  onSaved,
  onError,
  onSuccess,
}: {
  current: string
  onSaved: (text: string) => void
  onError: (text: string) => void
  onSuccess: () => void
}) {
  const [subject, setSubject] = useState(current)
  const saveMutation = useMutation({
    mutationFn: () => updatePlatformVapid({ vapid_subject: subject }),
    onSuccess: () => {
      onSuccess()
      onSaved('تم حفظ العنوان')
    },
    onError: () => onError('تعذر الحفظ'),
  })

  return (
    <div>
      <Label htmlFor="vapid-subject" className="text-xs text-muted-foreground">
        Subject (mailto أو رابط)
      </Label>
      <div className="mt-1 flex items-center gap-2">
        <Input
          id="vapid-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          dir="ltr"
          placeholder="mailto:support@stamply.cards"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || subject === current}
        >
          حفظ
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        بريد أو رابط يستخدمه push services للاتصال عند الحاجة.
      </p>
    </div>
  )
}

function ApnsSection({
  apns,
  onSaved,
  onError,
}: {
  apns: { team_id: string; key_id: string; bundle_id: string; has_key: boolean }
  onSaved: () => void
  onError: (text: string) => void
}) {
  const [form, setForm] = useState({
    team_id: apns.team_id,
    key_id: apns.key_id,
    bundle_id: apns.bundle_id,
    key_body: '',
  })

  const saveMutation = useMutation({
    mutationFn: () => updatePlatformApns(form),
    onSuccess: () => {
      onSaved()
      setForm((f) => ({ ...f, key_body: '' })) // clear the secret field after save
    },
    onError: () => onError('تعذر حفظ APNs'),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
          <Apple className="w-5 h-5 text-neutral-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">Apple Push / Apple Wallet (APNs)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            مطلوب لبطاقات Apple Wallet والتنبيهات على iOS. الاعتمادات تأتي من
            Apple Developer Account الخاص بـ Stamply.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="apns-team" className="text-xs text-muted-foreground">
              Team ID
            </Label>
            <Input
              id="apns-team"
              value={form.team_id}
              onChange={(e) => setForm({ ...form, team_id: e.target.value })}
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="ABC1234567"
            />
          </div>
          <div>
            <Label htmlFor="apns-key" className="text-xs text-muted-foreground">
              Key ID
            </Label>
            <Input
              id="apns-key"
              value={form.key_id}
              onChange={(e) => setForm({ ...form, key_id: e.target.value })}
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="XYZ9876543"
            />
          </div>
          <div>
            <Label htmlFor="apns-bundle" className="text-xs text-muted-foreground">
              Bundle ID
            </Label>
            <Input
              id="apns-bundle"
              value={form.bundle_id}
              onChange={(e) => setForm({ ...form, bundle_id: e.target.value })}
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="com.stamply.wallet"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="apns-key-body" className="text-xs text-muted-foreground">
            APNs Auth Key (.p8)
            {apns.has_key && (
              <span className="text-[10px] text-emerald-600 ms-2">✓ محفوظ</span>
            )}
          </Label>
          <Textarea
            id="apns-key-body"
            value={form.key_body}
            onChange={(e) => setForm({ ...form, key_body: e.target.value })}
            dir="ltr"
            rows={5}
            className="mt-1 font-mono text-[10px]"
            placeholder={
              apns.has_key
                ? '(المفتاح محفوظ — اتركه فارغاً للاحتفاظ به)'
                : '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
            }
          />
        </div>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin me-1.5" />
          ) : (
            <KeyRound className="w-4 h-4 me-1.5" />
          )}
          حفظ إعدادات APNs
        </Button>
      </form>
    </section>
  )
}

function FcmSection({
  fcm,
  onSaved,
  onError,
}: {
  fcm: { project_id: string; has_service_account: boolean }
  onSaved: () => void
  onError: (text: string) => void
}) {
  const [form, setForm] = useState({
    project_id: fcm.project_id,
    service_account: '',
  })

  const saveMutation = useMutation({
    mutationFn: () => updatePlatformFcm(form),
    onSuccess: () => {
      onSaved()
      setForm((f) => ({ ...f, service_account: '' }))
    },
    onError: () => onError('تعذر حفظ FCM'),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-neutral-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">Firebase Cloud Messaging (FCM)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            مطلوب لبطاقات Google Wallet والتنبيهات على Android. الاعتمادات من
            Firebase project الخاص بـ Stamply.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fcm-project" className="text-xs text-muted-foreground">
            FCM Project ID
          </Label>
          <Input
            id="fcm-project"
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            dir="ltr"
            className="mt-1 font-mono text-xs"
            placeholder="stamply-abc123"
          />
        </div>

        <div>
          <Label htmlFor="fcm-svc" className="text-xs text-muted-foreground">
            Service Account JSON
            {fcm.has_service_account && (
              <span className="text-[10px] text-emerald-600 ms-2">✓ محفوظ</span>
            )}
          </Label>
          <Textarea
            id="fcm-svc"
            value={form.service_account}
            onChange={(e) => setForm({ ...form, service_account: e.target.value })}
            dir="ltr"
            rows={6}
            className="mt-1 font-mono text-[10px]"
            placeholder={
              fcm.has_service_account
                ? '(محفوظ — اتركه فارغاً للاحتفاظ به)'
                : '{\n  "type": "service_account",\n  ...\n}'
            }
          />
        </div>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin me-1.5" />
          ) : (
            <KeyRound className="w-4 h-4 me-1.5" />
          )}
          حفظ إعدادات FCM
        </Button>
      </form>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────── */
/*  Apple Wallet                                                    */
/* ──────────────────────────────────────────────────────────────── */

function AppleWalletSection({
  apple,
  onSaved,
  onError,
}: {
  apple: PlatformWalletSettings['apple']
  onSaved: () => void
  onError: (text: string) => void
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
      onSaved()
      // Clear the secret fields so a refresh doesn't re-send them.
      setForm((f) => ({
        ...f,
        cert_pem: '',
        key_pem: '',
        key_password: '',
        wwdr_cert_pem: '',
      }))
    },
    onError: () => onError('تعذر حفظ شهادات Apple Wallet'),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  // Pre-compute the readiness chips so the JSX below stays scannable.
  // The order matters: cert presence → cert validity → key match →
  // production cert → HTTPS app URL → auto-update flag.
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

  // Expiry banner thresholds. Apple Pass Type ID certs are valid for
  // one year and break EVERYTHING the moment they lapse — pass signing
  // AND APNs auth. We escalate the visual urgency as the deadline
  // approaches so the operator can't miss it.
  const daysLeft = apple.cert_info?.days_until_expiry ?? null
  const expiryDate = apple.cert_info?.expires_at
    ? new Date(apple.cert_info.expires_at * 1000)
    : null
  const expiryFormatted = expiryDate
    ? expiryDate.toLocaleDateString('ar', {
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

      {/* Cert expiry banner — bold, color-graded, impossible to miss.
          Always rendered when a cert is uploaded, even when expiry is
          far away (a green "valid" state still reassures the operator
          on every page load). */}
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
                ⚠️ ستتوقّف بطاقات Apple Wallet عن التثبيت والتحديث فور انتهاء
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

      {/* Status panel — surfaces every readiness signal in one glance.
          Operators stop guessing whether the cert is valid, whether the
          environment can deliver pushes, and whether iOS will accept
          installs. Each chip carries a tooltip-style hint where relevant. */}
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

        {/* Detail rows that don't fit in chip form */}
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
                {new Date(apple.cert_info.expires_at * 1000).toLocaleDateString('ar')}
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

        {/* APNs sandbox toggle. Apple has two distinct APNs gateways:
            api.push.apple.com (production) and api.sandbox.push.apple.com.
            Pass Type ID certs technically work against both, but the
            sandbox gateway is useful when debugging — failed pushes
            return 410 Gone there too without affecting production
            registrations. Most operators leave this off. */}
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

/* ──────────────────────────────────────────────────────────────── */
/*  Google Wallet                                                   */
/* ──────────────────────────────────────────────────────────────── */

function GoogleWalletSection({
  google,
  onSaved,
  onError,
}: {
  google: PlatformWalletSettings['google']
  onSaved: () => void
  onError: (text: string) => void
}) {
  const [form, setForm] = useState({
    issuer_id: google.issuer_id,
    class_prefix: google.class_prefix,
    service_account: '',
  })

  const saveMutation = useMutation({
    mutationFn: () => updatePlatformGoogleWallet(form),
    onSuccess: () => {
      onSaved()
      setForm((f) => ({ ...f, service_account: '' }))
    },
    onError: () => onError('تعذر حفظ إعدادات Google Wallet'),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  // Match the Apple section's chip pattern so the two cards feel
  // consistent at a glance.
  const googleChips: Array<{ label: string; state: 'ok' | 'warn' | 'bad' }> = [
    {
      label: google.issuer_id ? 'Issuer ID محفوظ' : 'لا يوجد Issuer ID',
      state: google.issuer_id ? 'ok' : 'bad',
    },
    {
      label: google.class_prefix ? 'Class Prefix محفوظ' : 'لا يوجد Class Prefix',
      state: google.class_prefix ? 'ok' : 'warn',
    },
    {
      label: google.has_service_account
        ? 'Service Account محفوظ'
        : 'لا يوجد Service Account',
      state: google.has_service_account ? 'ok' : 'bad',
    },
  ]
  const googleReady =
    !!google.issuer_id && !!google.class_prefix && google.has_service_account

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5 text-neutral-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">Google Wallet — اعتمادات الإصدار</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            تحتاج Google Cloud project و Google Wallet API مفعّلة، ثم service
            account مع صلاحية "Wallet Object Issuer". احصل على Issuer ID من{' '}
            <a
              href="https://pay.google.com/business/console"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              dir="ltr"
            >
              Google Pay Business Console
            </a>
            .
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 mb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {googleReady ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          )}
          <span>حالة الإعدادات</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {googleChips.map((chip, i) => (
            <span
              key={i}
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
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="google-issuer" className="text-xs text-muted-foreground">
              Issuer ID
            </Label>
            <Input
              id="google-issuer"
              value={form.issuer_id}
              onChange={(e) => setForm({ ...form, issuer_id: e.target.value })}
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="3388000000012345678"
            />
          </div>
          <div>
            <Label htmlFor="google-class" className="text-xs text-muted-foreground">
              Class Prefix
            </Label>
            <Input
              id="google-class"
              value={form.class_prefix}
              onChange={(e) => setForm({ ...form, class_prefix: e.target.value })}
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="stamply_loyalty"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="google-sa" className="text-xs text-muted-foreground">
            Service Account JSON
            {google.has_service_account && (
              <span className="text-[10px] text-emerald-600 ms-2">✓ محفوظ</span>
            )}
          </Label>
          <Textarea
            id="google-sa"
            value={form.service_account}
            onChange={(e) => setForm({ ...form, service_account: e.target.value })}
            dir="ltr"
            rows={7}
            className="mt-1 font-mono text-[10px]"
            placeholder={
              google.has_service_account
                ? '(محفوظ — اتركه فارغاً للاحتفاظ به)'
                : '{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  ...\n}'
            }
          />
        </div>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin me-1.5" />
          ) : (
            <KeyRound className="w-4 h-4 me-1.5" />
          )}
          حفظ إعدادات Google Wallet
        </Button>
      </form>
    </section>
  )
}
