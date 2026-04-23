import { useState, type FormEvent } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  MessageSquare,
  Save,
  Send,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Power,
  PowerOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackButton } from '@/components/ui/back-button'
import {
  getOtpSmsConfig,
  updateOtpMessageCentral,
  updateOtpUnifonic,
  updateOtpSmsCountry,
  updateOtpTwilio,
  testOtpSms,
  type OtpMessageCentralInput,
  type OtpUnifonicInput,
  type OtpSmsCountryInput,
  type OtpTwilioInput,
} from '@/lib/api/op/settings'

export default function OpSettingsOtpSmsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['op-settings', 'otp-sms'],
    queryFn: getOtpSmsConfig,
  })

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 4000)
  }

  if (isLoading || !data) {
    return <FullPageLoader />
  }

  const activeProvider = data.messagecentral.enabled
    ? 'MessageCentral'
    : data.unifonic.enabled
      ? 'Unifonic'
      : data.smscountry.enabled
        ? 'SMSCountry'
        : data.twilio.enabled
          ? 'Twilio'
          : null

  return (
    <div className="max-w-3xl">
      <BackButton href="/op/app-settings" />
      <h1 className="text-2xl font-bold mb-2">مزوّدو SMS للـ OTP</h1>
      <p className="text-sm text-muted-foreground mb-6">
        إعدادات مزوّد الرسائل النصية المستخدم لإرسال رموز التحقق (OTP) في التطبيق.
        فعّل مزوّد واحد فقط — عند تفعيل مزوّد يُعطّل الآخر تلقائياً.
      </p>

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

      {/* Active provider badge */}
      <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-center gap-2 mb-6">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span>
          المزوّد الحالي:{' '}
          <strong className={activeProvider ? 'text-emerald-600' : 'text-destructive'}>
            {activeProvider ?? 'لا يوجد مزوّد مفعّل'}
          </strong>
        </span>
      </div>

      {/* MessageCentral section */}
      <MessageCentralCard
        config={data.messagecentral}
        flash={flash}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['op-settings', 'otp-sms'] })}
      />

      {/* Unifonic section */}
      <UnifonicCard
        config={data.unifonic}
        flash={flash}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['op-settings', 'otp-sms'] })}
      />

      {/* SMSCountry section */}
      <SmsCountryCard
        config={data.smscountry}
        flash={flash}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['op-settings', 'otp-sms'] })}
      />

      {/* Twilio section */}
      <TwilioCard
        config={data.twilio}
        flash={flash}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['op-settings', 'otp-sms'] })}
      />
    </div>
  )
}

/* ─────────────────────────────────────── */
/*  MessageCentral Card                    */
/* ─────────────────────────────────────── */

function MessageCentralCard({
  config,
  flash,
  onSuccess,
}: {
  config: { enabled: boolean; customer_id: string; auth_token_masked: string; has_auth_token: boolean }
  flash: (ok: boolean, text: string) => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<OtpMessageCentralInput>({
    enabled: config.enabled,
    customer_id: config.customer_id,
    auth_token: '',
  })
  const [showToken, setShowToken] = useState(false)
  const [testTo, setTestTo] = useState('')

  const set = <K extends keyof OtpMessageCentralInput>(key: K, val: OtpMessageCentralInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const saveMutation = useMutation({
    mutationFn: () => updateOtpMessageCentral(form),
    onSuccess: () => {
      onSuccess()
      flash(true, 'تم حفظ إعدادات MessageCentral')
      setForm((f) => ({ ...f, auth_token: '' }))
    },
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'تعذر حفظ الإعدادات'),
  })

  const testMutation = useMutation({
    mutationFn: () => testOtpSms('messagecentral', testTo),
    onSuccess: (res) => flash(res.ok, res.message),
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'فشل الإرسال'),
  })

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">MessageCentral</h2>
            {config.enabled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <Power className="w-3 h-3" /> مفعّل
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <PowerOff className="w-3 h-3" /> معطّل
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            مزوّد OTP متكامل — يولّد ويتحقق من الرمز تلقائياً عبر API
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <label
          htmlFor="mc-enabled"
          className="flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 cursor-pointer"
        >
          <span className="text-sm">
            {form.enabled ? 'مفعّل — يُستخدم لإرسال OTP' : 'معطّل'}
          </span>
          <input
            id="mc-enabled"
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={!!form.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mc-customer-id">Customer ID</Label>
            <Input
              id="mc-customer-id"
              dir="ltr"
              value={form.customer_id ?? ''}
              onChange={(e) => set('customer_id', e.target.value)}
              placeholder="C-XXXXXXXXXXXXXXX"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mc-auth-token">
              Auth Token
              {config.has_auth_token && !form.auth_token && (
                <span className="text-[11px] text-muted-foreground ms-2">
                  (احتفظ فارغاً للإبقاء على الحالي)
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="mc-auth-token"
                type={showToken ? 'text' : 'password'}
                dir="ltr"
                value={form.auth_token ?? ''}
                onChange={(e) => set('auth_token', e.target.value)}
                placeholder={config.has_auth_token ? config.auth_token_masked : 'رمز المصادقة (JWT)'}
                className="font-mono pe-9"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="إظهار/إخفاء"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Save className="w-4 h-4 me-1.5" />
            )}
            حفظ MessageCentral
          </Button>
        </div>
      </form>

      {/* Test */}
      <div className="border-t mt-5 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Send className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">اختبار الإرسال</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="tel"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="+966555123456"
            dir="ltr"
            className="flex-1 font-mono text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testTo}
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Send className="w-4 h-4 me-1.5" />
            )}
            إرسال
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────── */
/*  Unifonic Card                          */
/* ─────────────────────────────────────── */

function UnifonicCard({
  config,
  flash,
  onSuccess,
}: {
  config: { enabled: boolean; app_sid: string; sender_id: string }
  flash: (ok: boolean, text: string) => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<OtpUnifonicInput>({
    enabled: config.enabled,
    app_sid: config.app_sid,
    sender_id: config.sender_id,
  })
  const [testTo, setTestTo] = useState('')

  const set = <K extends keyof OtpUnifonicInput>(key: K, val: OtpUnifonicInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const saveMutation = useMutation({
    mutationFn: () => updateOtpUnifonic(form),
    onSuccess: () => {
      onSuccess()
      flash(true, 'تم حفظ إعدادات Unifonic')
    },
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'تعذر حفظ الإعدادات'),
  })

  const testMutation = useMutation({
    mutationFn: () => testOtpSms('unifonic', testTo),
    onSuccess: (res) => flash(res.ok, res.message),
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'فشل الإرسال'),
  })

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Unifonic</h2>
            {config.enabled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <Power className="w-3 h-3" /> مفعّل
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <PowerOff className="w-3 h-3" /> معطّل
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            مزوّد OTP سعودي — يولّد ويتحقق من الرمز تلقائياً عبر Verify API
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <label
          htmlFor="uni-enabled"
          className="flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 cursor-pointer"
        >
          <span className="text-sm">
            {form.enabled ? 'مفعّل — يُستخدم لإرسال OTP' : 'معطّل'}
          </span>
          <input
            id="uni-enabled"
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={!!form.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="uni-app-sid">App SID</Label>
            <Input
              id="uni-app-sid"
              dir="ltr"
              value={form.app_sid ?? ''}
              onChange={(e) => set('app_sid', e.target.value)}
              placeholder="axuN0U7QlmqVPsfdgoK0mZxxxxxxxx"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              معرّف التطبيق من لوحة تحكم Unifonic
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="uni-sender-id">Sender ID</Label>
            <Input
              id="uni-sender-id"
              dir="ltr"
              value={form.sender_id ?? ''}
              onChange={(e) => set('sender_id', e.target.value)}
              placeholder="Stamply"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              اسم المرسل المُسجّل في Unifonic
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Save className="w-4 h-4 me-1.5" />
            )}
            حفظ Unifonic
          </Button>
        </div>
      </form>

      {/* Test */}
      <div className="border-t mt-5 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Send className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">اختبار الإرسال</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="tel"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="+966555123456"
            dir="ltr"
            className="flex-1 font-mono text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testTo}
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Send className="w-4 h-4 me-1.5" />
            )}
            إرسال
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────── */
/*  SMSCountry Card                        */
/* ─────────────────────────────────────── */

function SmsCountryCard({
  config,
  flash,
  onSuccess,
}: {
  config: { enabled: boolean; auth_key: string; auth_token_masked: string; has_auth_token: boolean; sender_id: string }
  flash: (ok: boolean, text: string) => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<OtpSmsCountryInput>({
    enabled: config.enabled,
    auth_key: config.auth_key,
    auth_token: '',
    sender_id: config.sender_id,
  })
  const [showToken, setShowToken] = useState(false)
  const [testTo, setTestTo] = useState('')

  const set = <K extends keyof OtpSmsCountryInput>(key: K, val: OtpSmsCountryInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const saveMutation = useMutation({
    mutationFn: () => updateOtpSmsCountry(form),
    onSuccess: () => {
      onSuccess()
      flash(true, 'تم حفظ إعدادات SMSCountry')
      setForm((f) => ({ ...f, auth_token: '' }))
    },
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'تعذر حفظ الإعدادات'),
  })

  const testMutation = useMutation({
    mutationFn: () => testOtpSms('smscountry', testTo),
    onSuccess: (res) => flash(res.ok, res.message),
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'فشل الإرسال'),
  })

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">SMSCountry</h2>
            {config.enabled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <Power className="w-3 h-3" /> مفعّل
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <PowerOff className="w-3 h-3" /> معطّل
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            مزوّد SMS دولي يدعم المملكة العربية السعودية والشرق الأوسط
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Enable toggle */}
        <label
          htmlFor="sc-enabled"
          className="flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 cursor-pointer"
        >
          <span className="text-sm">
            {form.enabled ? 'مفعّل — يُستخدم لإرسال OTP' : 'معطّل'}
          </span>
          <input
            id="sc-enabled"
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={!!form.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sc-auth-key">Auth Key</Label>
            <Input
              id="sc-auth-key"
              dir="ltr"
              value={form.auth_key ?? ''}
              onChange={(e) => set('auth_key', e.target.value)}
              placeholder="مفتاح المصادقة من SMSCountry"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sc-auth-token">
              Auth Token
              {config.has_auth_token && !form.auth_token && (
                <span className="text-[11px] text-muted-foreground ms-2">
                  (احتفظ فارغاً للإبقاء على الحالي)
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="sc-auth-token"
                type={showToken ? 'text' : 'password'}
                dir="ltr"
                value={form.auth_token ?? ''}
                onChange={(e) => set('auth_token', e.target.value)}
                placeholder={config.has_auth_token ? config.auth_token_masked : 'رمز المصادقة'}
                className="font-mono pe-9"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="إظهار/إخفاء"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sc-sender-id">Sender ID</Label>
            <Input
              id="sc-sender-id"
              dir="ltr"
              value={form.sender_id ?? ''}
              onChange={(e) => set('sender_id', e.target.value)}
              placeholder="Stamply"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              اسم المرسل الذي يظهر للعميل (حد أقصى 11 حرف)
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Save className="w-4 h-4 me-1.5" />
            )}
            حفظ SMSCountry
          </Button>
        </div>
      </form>

      {/* Test */}
      <div className="border-t mt-5 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Send className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">اختبار الإرسال</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="tel"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="+966555123456"
            dir="ltr"
            className="flex-1 font-mono text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testTo}
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Send className="w-4 h-4 me-1.5" />
            )}
            إرسال
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────── */
/*  Twilio Card                            */
/* ─────────────────────────────────────── */

function TwilioCard({
  config,
  flash,
  onSuccess,
}: {
  config: { enabled: boolean; account_sid: string; auth_token_masked: string; has_auth_token: boolean; from_number: string }
  flash: (ok: boolean, text: string) => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<OtpTwilioInput>({
    enabled: config.enabled,
    account_sid: config.account_sid,
    auth_token: '',
    from_number: config.from_number,
  })
  const [showToken, setShowToken] = useState(false)
  const [testTo, setTestTo] = useState('')

  const set = <K extends keyof OtpTwilioInput>(key: K, val: OtpTwilioInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const saveMutation = useMutation({
    mutationFn: () => updateOtpTwilio(form),
    onSuccess: () => {
      onSuccess()
      flash(true, 'تم حفظ إعدادات Twilio')
      setForm((f) => ({ ...f, auth_token: '' }))
    },
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'تعذر حفظ الإعدادات'),
  })

  const testMutation = useMutation({
    mutationFn: () => testOtpSms('twilio', testTo),
    onSuccess: (res) => flash(res.ok, res.message),
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'فشل الإرسال'),
  })

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Twilio</h2>
            {config.enabled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <Power className="w-3 h-3" /> مفعّل
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <PowerOff className="w-3 h-3" /> معطّل
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            مزوّد SMS عالمي من Twilio
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Enable toggle */}
        <label
          htmlFor="tw-enabled"
          className="flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 cursor-pointer"
        >
          <span className="text-sm">
            {form.enabled ? 'مفعّل — يُستخدم لإرسال OTP' : 'معطّل'}
          </span>
          <input
            id="tw-enabled"
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={!!form.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tw-account-sid">Account SID</Label>
            <Input
              id="tw-account-sid"
              dir="ltr"
              value={form.account_sid ?? ''}
              onChange={(e) => set('account_sid', e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tw-auth-token">
              Auth Token
              {config.has_auth_token && !form.auth_token && (
                <span className="text-[11px] text-muted-foreground ms-2">
                  (احتفظ فارغاً للإبقاء على الحالي)
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="tw-auth-token"
                type={showToken ? 'text' : 'password'}
                dir="ltr"
                value={form.auth_token ?? ''}
                onChange={(e) => set('auth_token', e.target.value)}
                placeholder={config.has_auth_token ? config.auth_token_masked : 'xxxxxxxxxxxxxxxx'}
                className="font-mono pe-9"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="إظهار/إخفاء"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tw-from-number">From Number</Label>
            <Input
              id="tw-from-number"
              dir="ltr"
              value={form.from_number ?? ''}
              onChange={(e) => set('from_number', e.target.value)}
              placeholder="+12605303702"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              رقم مُسجّل في Twilio، بصيغة E.164 (يبدأ بـ +)
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Save className="w-4 h-4 me-1.5" />
            )}
            حفظ Twilio
          </Button>
        </div>
      </form>

      {/* Test */}
      <div className="border-t mt-5 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Send className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">اختبار الإرسال</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="tel"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="+966555123456"
            dir="ltr"
            className="flex-1 font-mono text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testTo}
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Send className="w-4 h-4 me-1.5" />
            )}
            إرسال
          </Button>
        </div>
      </div>
    </section>
  )
}
