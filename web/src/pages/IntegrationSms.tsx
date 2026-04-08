import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { BackButton } from '@/components/ui/back-button'
import {
  Smartphone,
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
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { EditButton } from '@/components/ui/edit-button'
import { PageHeader } from '@/components/ui/page-header'
import {
  getSmsConfig,
  updateSmsConfig,
  sendTestSms,
  type SmsConfigInput,
} from '@/lib/integrationsApi'
import {
  listSmsTemplates,
  getSmsTemplate,
  toggleSmsTemplate,
  type SmsTemplateListItem,
} from '@/lib/smsTemplatesApi'

/**
 * /settings/integrations/sms — edit Twilio credentials for SMS.
 * Mirrors the email integration page.
 */
export default function IntegrationSmsPage() {
  const qc = useQueryClient()

  const { data: config, isLoading } = useQuery({
    queryKey: ['integration-sms'],
    queryFn: getSmsConfig,
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: listSmsTemplates,
  })

  const [form, setForm] = useState<SmsConfigInput>({})
  const [showToken, setShowToken] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (config) {
      setForm({
        enabled: config.enabled,
        provider: config.provider,
        account_sid: config.account_sid,
        auth_token: '',
        from_number: config.from_number,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const set = <K extends keyof SmsConfigInput>(key: K, val: SmsConfigInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const saveMutation = useMutation({
    mutationFn: () => updateSmsConfig(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration-sms'] })
      qc.invalidateQueries({ queryKey: ['wallet-availability'] })
      setSaveMsg({ ok: true, text: 'تم حفظ الإعدادات' })
      setTimeout(() => setSaveMsg(null), 3000)
      setForm((f) => ({ ...f, auth_token: '' }))
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      setSaveMsg({
        ok: false,
        text: err.response?.data?.message ?? 'تعذر حفظ الإعدادات',
      })
    },
  })

  const testMutation = useMutation({
    mutationFn: () => sendTestSms(testTo, form),
    onSuccess: (res) => setTestMsg({ ok: res.ok, text: res.message }),
    onError: (err: AxiosError<{ message?: string }>) => {
      setTestMsg({
        ok: false,
        text: err.response?.data?.message ?? 'فشل الإرسال',
      })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (vars: { key: string; next: boolean }) => {
      const full = await getSmsTemplate(vars.key)
      return toggleSmsTemplate(vars.key, vars.next, full.body)
    },
    onMutate: async ({ key, next }) => {
      await qc.cancelQueries({ queryKey: ['sms-templates'] })
      const previous = qc.getQueryData<SmsTemplateListItem[]>(['sms-templates'])
      qc.setQueryData<SmsTemplateListItem[]>(
        ['sms-templates'],
        (old) => old?.map((t) => (t.key === key ? { ...t, is_enabled: next } : t)) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['sms-templates'], ctx.previous)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sms-templates'] }),
  })

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    setSaveMsg(null)
    saveMutation.mutate()
  }

  if (isLoading || !config) {
    return <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
  }

  return (
    <div className="max-w-3xl">
      <BackButton href="/admin/settings" label="الإعدادات" className="mb-3" />

      <PageHeader
        icon={<Smartphone />}
        title="الرسائل النصية"
        subtitle="تكوين مزود Twilio لإرسال رسائل SMS تلقائية للعملاء"
      />

      {/* Settings form */}
      <form onSubmit={handleSave} className="rounded-xl border bg-card p-6 space-y-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="provider">المزود</Label>
            <Input id="provider" value={form.provider ?? 'Twilio'} readOnly disabled />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enabled">الحالة</Label>
            <label
              htmlFor="enabled-switch"
              className="flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 cursor-pointer"
            >
              <span className="text-sm">
                {form.enabled ? 'مفعّل — يرسل SMS فعلي' : 'معطّل — وضع محاكاة'}
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
            <Label htmlFor="account_sid">Account SID</Label>
            <Input
              id="account_sid"
              dir="ltr"
              value={form.account_sid ?? ''}
              onChange={(e) => set('account_sid', e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="auth_token">
              Auth Token
              {config.has_auth_token && !form.auth_token && (
                <span className="text-[11px] text-muted-foreground ms-2">
                  (احتفظ فارغاً للإبقاء على الحالي)
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="auth_token"
                type={showToken ? 'text' : 'password'}
                dir="ltr"
                value={form.auth_token ?? ''}
                onChange={(e) => set('auth_token', e.target.value)}
                placeholder={config.has_auth_token ? config.auth_token : 'xxxxxxxxxxxxxxxx'}
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
            <Label htmlFor="from_number">SMS From Number</Label>
            <Input
              id="from_number"
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
          يستخدم القيم الحالية في النموذج ويُرسل رسالة SMS حقيقية عبر Twilio
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="tel"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="+966555123456"
            dir="ltr"
            className="flex-1 font-mono"
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

      {/* When Stamply sends SMS */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-1">متى تستخدم Stamply هذه الخدمة؟</h2>
        <p className="text-xs text-muted-foreground mb-5">
          الأحداث التي يتم إرسال رسالة SMS فيها تلقائياً للعملاء
        </p>
        <ul className="space-y-3">
          {(
            [
              {
                key: 'welcome',
                icon: <UserPlus className="w-4 h-4 text-blue-500" />,
                title: 'رسالة ترحيبية',
                description: 'SMS ترحيبي فور تسجيل عميل جديد مع رابط البطاقة',
              },
              {
                key: 'birthday',
                icon: <Cake className="w-4 h-4 text-pink-500" />,
                title: 'عيد الميلاد 🎂',
                description: 'تهنئة يوم عيد ميلاد العميل مع إشعار بالأختام المجانية',
              },
              {
                key: 'winback',
                icon: <Bell className="w-4 h-4 text-amber-500" />,
                title: 'تذكير العودة',
                description: 'SMS لإعادة جذب العملاء غير النشطين',
              },
              {
                key: 'redemption',
                icon: <Mail className="w-4 h-4 text-purple-500" />,
                title: 'تأكيد الاستبدال',
                description: 'إشعار فوري فور صرف مكافأة',
              },
              {
                key: 'campaign',
                icon: <Megaphone className="w-4 h-4 text-emerald-500" />,
                title: 'حملات يدوية',
                description: 'رسائل تسويقية تُرسلها يدوياً من صفحة العملاء',
              },
            ] as const
          ).map((ev) => {
            const tpl = templates.find((t) => t.key === ev.key)
            return (
              <SmsEventItem
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
      </div>
    </div>
  )
}

function SmsEventItem({
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

      <div className="flex items-center gap-2 shrink-0">
        <EditButton
          href={`/admin/settings/sms-templates/${templateKey}`}
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
            {enabled ? 'الرسالة مفعّلة' : 'الرسالة معطّلة'}
          </TooltipContent>
        </Tooltip>
      </div>
    </li>
  )
}
