import { useEffect, useState, type FormEvent } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { BackButton } from '@/components/ui/back-button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Mail,
  Save,
  Send,
  Check,
  AlertCircle,
  Loader2,
  Cake,
  UserPlus,
  Bell,
  Megaphone,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { EditButton } from '@/components/ui/edit-button'
import { PageHeader } from '@/components/ui/page-header'
import {
  listEmailTemplates,
  getEmailTemplate,
  toggleEmailTemplate,
  type EmailTemplateListItem,
} from '@/lib/api/email-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getEmailConfig,
  updateEmailConfig,
  sendTestEmail,
  type EmailConfigInput,
} from '@/lib/api/integrations'

/**
 * /settings/integrations/email — edit SMTP credentials for transactional email.
 * Everything is stored on the tenant row so changes take effect immediately
 * without touching .env.
 */
export default function IntegrationEmailPage() {
  const qc = useQueryClient()

  const { data: config, isLoading } = useQuery({
    queryKey: ['integration-email'],
    queryFn: getEmailConfig,
  })

  // Template list drives the Switch on each event row
  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: listEmailTemplates,
  })

  // Optimistic toggle: flip the cached value immediately, roll back on error.
  const toggleMutation = useMutation({
    mutationFn: async (vars: { key: string; next: boolean }) => {
      // Need full subject + html — fetch the template once.
      const full = await getEmailTemplate(vars.key)
      return toggleEmailTemplate(vars.key, vars.next, {
        subject: full.subject,
        html: full.html,
      })
    },
    onMutate: async ({ key, next }) => {
      await qc.cancelQueries({ queryKey: ['email-templates'] })
      const previous = qc.getQueryData<EmailTemplateListItem[]>(['email-templates'])
      qc.setQueryData<EmailTemplateListItem[]>(
        ['email-templates'],
        (old) => old?.map((t) => (t.key === key ? { ...t, is_enabled: next } : t)) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['email-templates'], ctx.previous)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] })
    },
  })

  const [form, setForm] = useState<EmailConfigInput>({})
  const [showPassword, setShowPassword] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Initialize form from loaded config
  useEffect(() => {
    if (config) {
      setForm({
        enabled: config.enabled,
        provider: config.provider,
        host: config.host,
        port: config.port,
        username: config.username,
        password: '', // never prefill
        encryption: config.encryption,
        from_address: config.from_address,
        from_name: config.from_name,
      })
      if (!testTo && config.from_address) setTestTo(config.from_address)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const set = <K extends keyof EmailConfigInput>(key: K, val: EmailConfigInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const saveMutation = useMutation({
    mutationFn: () => updateEmailConfig(form),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['integration-email'] })
      qc.invalidateQueries({ queryKey: ['wallet-availability'] })
      setSaveMsg({ ok: true, text: 'تم حفظ الإعدادات' })
      setTimeout(() => setSaveMsg(null), 3000)
      // Refresh local form state so the masked password is shown
      setForm((f) => ({ ...f, password: '' }))
      return updated
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      setSaveMsg({
        ok: false,
        text: err.response?.data?.message ?? 'تعذر حفظ الإعدادات',
      })
    },
  })

  const testMutation = useMutation({
    mutationFn: () =>
      sendTestEmail(
        testTo,
        // Use unsaved form values so the test uses whatever the user has just typed
        form,
      ),
    onSuccess: (res) => setTestMsg({ ok: res.ok, text: res.message }),
    onError: (err: AxiosError<{ message?: string }>) => {
      setTestMsg({
        ok: false,
        text: err.response?.data?.message ?? 'فشل الإرسال',
      })
    },
  })

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    setSaveMsg(null)
    saveMutation.mutate()
  }

  if (isLoading || !config) {
    return <FullPageLoader />
  }

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <BackButton href="/admin/settings" label="الإعدادات" className="mb-3" />

      <PageHeader
        icon={<Mail />}
        title="البريد الإلكتروني"
        subtitle="تكوين مزود SMTP لإرسال البريد الإلكتروني التلقائي للعملاء"
      />

      {/* Settings form */}
      <form onSubmit={handleSave} className="rounded-xl border bg-card p-6 space-y-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="provider">المزود</Label>
            <Select
              value={form.provider ?? 'SendGrid'}
              onValueChange={(v) => set('provider', v)}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SendGrid">SendGrid</SelectItem>
                <SelectItem value="Resend">Resend</SelectItem>
                <SelectItem value="Mailgun">Mailgun</SelectItem>
                <SelectItem value="Postmark">Postmark</SelectItem>
                <SelectItem value="Amazon SES">Amazon SES</SelectItem>
                <SelectItem value="SMTP">SMTP مخصص</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enabled">الحالة</Label>
            <label
              htmlFor="enabled-switch"
              className="flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 cursor-pointer"
            >
              <span className="text-sm">
                {form.enabled ? 'مفعّل — يرسل بريد فعلي' : 'معطّل — وضع محاكاة'}
              </span>
              <input
                id="enabled-switch"
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={!!form.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
              />
            </label>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="host">الخادم (Host)</Label>
            <Input
              id="host"
              dir="ltr"
              value={form.host ?? ''}
              onChange={(e) => set('host', e.target.value)}
              placeholder="smtp.sendgrid.net"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="port">المنفذ (Port)</Label>
            <Input
              id="port"
              type="number"
              dir="ltr"
              value={form.port ?? 587}
              onChange={(e) => set('port', Number(e.target.value))}
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="encryption">التشفير</Label>
            <Select
              value={form.encryption ?? 'tls'}
              onValueChange={(v) => set('encryption', v as 'tls' | 'ssl' | 'none')}
            >
              <SelectTrigger id="encryption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tls">STARTTLS (587)</SelectItem>
                <SelectItem value="ssl">SSL/TLS (465)</SelectItem>
                <SelectItem value="none">بدون تشفير</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">اسم المستخدم (Username)</Label>
            <Input
              id="username"
              dir="ltr"
              value={form.username ?? ''}
              onChange={(e) => set('username', e.target.value)}
              placeholder="apikey"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              كلمة المرور / API Key
              {config.has_password && !form.password && (
                <span className="text-[11px] text-muted-foreground ms-2">
                  (احتفظ فارغاً للإبقاء على الحالية)
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={form.password ?? ''}
                onChange={(e) => set('password', e.target.value)}
                placeholder={config.has_password ? config.password : 'SG.xxxxxx...'}
                className="font-mono pe-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="إظهار/إخفاء"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="from_address">From Email</Label>
            <Input
              id="from_address"
              type="email"
              dir="ltr"
              value={form.from_address ?? ''}
              onChange={(e) => set('from_address', e.target.value)}
              placeholder="noreply@example.com"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="from_name">From Name</Label>
            <Input
              id="from_name"
              value={form.from_name ?? ''}
              onChange={(e) => set('from_name', e.target.value)}
              placeholder="Stamply"
            />
          </div>
        </div>

        {saveMsg && (
          <div
            className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${
              saveMsg.ok
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            }`}
          >
            {saveMsg.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {saveMsg.text}
          </div>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                جارٍ الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 me-1.5" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Test send */}
      <div className="rounded-xl border bg-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">اختبار الإرسال</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          يستخدم القيم المكتوبة حالياً في النموذج أعلاه (حتى قبل الحفظ) لإرسال رسالة اختبارية
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="أدخل بريد المستلم"
            dir="ltr"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testTo}
          >
            {testMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                جارٍ الإرسال...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 me-1.5" />
                إرسال اختبار
              </>
            )}
          </Button>
        </div>

        {testMsg && (
          <div
            className={`mt-3 rounded-lg border p-3 text-sm flex items-center gap-2 ${
              testMsg.ok
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            }`}
          >
            {testMsg.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {testMsg.text}
          </div>
        )}
      </div>

      {/* When Stamply sends emails */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-1">متى تستخدم Stamply هذه الخدمة؟</h2>
        <p className="text-xs text-muted-foreground mb-5">
          الأحداث التي يتم إرسال بريد إلكتروني فيها تلقائياً للعملاء
        </p>
        <ul className="space-y-3">
          {(
            [
              {
                key: 'welcome',
                icon: <UserPlus className="w-4 h-4 text-violet-500" />,
                title: 'رسالة ترحيبية',
                description: 'عند تسجيل عميل جديد وإصدار بطاقته — رسالة شكر مع رابط البطاقة',
              },
              {
                key: 'birthday',
                icon: <Cake className="w-4 h-4 text-pink-500" />,
                title: 'عيد الميلاد 🎂',
                description: 'يُرسل تلقائياً يوم عيد ميلاد العميل مع إشعار بالأختام المجانية',
              },
              {
                key: 'winback',
                icon: <Bell className="w-4 h-4 text-amber-500" />,
                title: 'تذكير العودة',
                description: 'عند مرور فترة على آخر زيارة للعميل (بعد N يوم من عدم النشاط)',
              },
              {
                key: 'redemption',
                icon: <Mail className="w-4 h-4 text-purple-500" />,
                title: 'تأكيد الاستبدال',
                description: 'عند صرف مكافأة — إيصال رقمي بتفاصيل العملية',
              },
              {
                key: 'campaign',
                icon: <Megaphone className="w-4 h-4 text-emerald-500" />,
                title: 'حملات يدوية',
                description: 'رسائل تسويقية تُرسلها يدوياً لشريحة من العملاء من صفحة العملاء',
              },
            ] as const
          ).map((ev) => {
            const tpl = templates.find((t) => t.key === ev.key)
            return (
              <EventItem
                key={ev.key}
                templateKey={ev.key}
                icon={ev.icon}
                title={ev.title}
                description={ev.description}
                enabled={tpl?.is_enabled ?? true}
                onToggle={(next) => toggleMutation.mutate({ key: ev.key, next })}
                toggling={toggleMutation.isPending && toggleMutation.variables?.key === ev.key}
              />
            )
          })}
        </ul>

        <div className="mt-5 pt-4 border-t text-xs text-muted-foreground">
          💡 الأحداث التلقائية تُرسل عبر Laravel Scheduler. الأحداث الفورية تُرسل مباشرة عند وقوعها.
        </div>
      </div>
    </div>
  )
}

function EventItem({
  icon,
  title,
  description,
  templateKey,
  enabled,
  onToggle,
  toggling,
}: {
  icon: React.ReactNode
  title: string
  description: string
  templateKey: string
  enabled: boolean
  onToggle: (next: boolean) => void
  toggling: boolean
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border p-3 hover:border-primary/40 transition ${
        enabled ? '' : 'opacity-60'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>

      {/* Edit + Switch — in that order so the edit button stays closest to the text in RTL */}
      <div className="flex items-center gap-2 shrink-0">
        <EditButton
          href={`/admin/settings/email-templates/${templateKey}`}
          label="تحرير محتوى الرسالة"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Switch
                checked={enabled}
                onCheckedChange={onToggle}
                disabled={toggling}
                aria-label={enabled ? 'تعطيل الرسالة' : 'تفعيل الرسالة'}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {enabled ? 'الرسالة مفعّلة — اضغط للتعطيل' : 'الرسالة معطّلة — اضغط للتفعيل'}
          </TooltipContent>
        </Tooltip>
      </div>
    </li>
  )
}
