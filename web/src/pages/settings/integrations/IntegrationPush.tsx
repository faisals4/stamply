import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { FullPageLoader } from '@/components/ui/spinner'
import {
  Bell,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Info,
  UserPlus,
  Cake,
  Gift,
  Megaphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EditButton } from '@/components/ui/edit-button'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { getPushConfig, updatePushConfig, type PushConfigInput } from '@/lib/api/integrations'
import {
  listPushTemplates,
  getPushTemplate,
  togglePushTemplate,
  type PushTemplateListItem,
} from '@/lib/api/push-templates'

/**
 * /admin/settings/integrations/push — configure Web Push (VAPID) + APNs +
 * FCM credentials for the tenant. The actual sending is stubbed on the
 * backend until credentials are filled in; this page simply exposes the
 * storage surface so a tenant can prep their keys ahead of time.
 */
export default function IntegrationPushPage() {
  const qc = useQueryClient()
  const { data: config, isLoading } = useQuery({
    queryKey: ['integrations', 'push'],
    queryFn: getPushConfig,
  })

  // Lazily fetch the 5 templates so we can render the event list below
  // the credentials form (same pattern as the SMS integration page).
  const { data: templates = [] } = useQuery({
    queryKey: ['push-templates'],
    queryFn: listPushTemplates,
  })

  const toggleMutation = useMutation({
    mutationFn: async (vars: { key: string; next: boolean }) => {
      const full = await getPushTemplate(vars.key)
      return togglePushTemplate(vars.key, vars.next, {
        title: full.title,
        body: full.body,
        url: full.url,
      })
    },
    onMutate: async ({ key, next }) => {
      await qc.cancelQueries({ queryKey: ['push-templates'] })
      const previous = qc.getQueryData<PushTemplateListItem[]>(['push-templates'])
      qc.setQueryData<PushTemplateListItem[]>(
        ['push-templates'],
        (old) =>
          old?.map((t) => (t.key === key ? { ...t, is_enabled: next } : t)) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['push-templates'], ctx.previous)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push-templates'] }),
  })

  const [form, setForm] = useState<PushConfigInput>({})
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!config) return
    setForm({
      enabled: config.enabled,
      vapid_public_key: config.vapid_public_key,
      vapid_subject: config.vapid_subject,
      apns_team_id: config.apns_team_id,
      apns_key_id: config.apns_key_id,
      apns_bundle_id: config.apns_bundle_id,
      fcm_project_id: config.fcm_project_id,
    })
  }, [config])

  const saveMutation = useMutation({
    mutationFn: (patch: PushConfigInput) => updatePushConfig(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'push'] })
      setSaveMsg({ ok: true, text: 'تم حفظ الإعدادات' })
      setTimeout(() => setSaveMsg(null), 2500)
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'تعذر الحفظ'
          : 'تعذر الحفظ'
      setSaveMsg({ ok: false, text: msg })
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  if (isLoading || !config) {
    return <FullPageLoader />
  }

  return (
    <div className="max-w-3xl">
      <BackButton href="/admin/settings" label="الإعدادات" className="mb-3" />

      <PageHeader
        icon={<Bell />}
        title="إعدادات التنبيهات"
        subtitle="تكوين مفاتيح Web Push و Apple Push و Firebase Cloud Messaging"
      />

      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 mb-6 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">البنية جاهزة — الإرسال الفعلي قيد التطوير</p>
          <p>
            يمكنك حفظ مفاتيحك الآن وستُستخدم فور اكتمال طبقة الإرسال. حتى ذلك
            الوقت، الرسائل المُرسَلة على قناة "تنبيه" تُسجَّل في logs الخادم
            ولا تصل إلى الأجهزة فعلياً.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Master toggle */}
        <div className="rounded-xl border bg-card p-5 flex items-center justify-between">
          <div>
            <Label className="font-semibold">تفعيل التنبيهات</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              عند التفعيل، قناة "تنبيه" تظهر في صفحة إنشاء رسالة جديدة
            </p>
          </div>
          <Switch
            checked={form.enabled ?? false}
            onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
          />
        </div>

        {/* VAPID keys — Web Push */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Web Push (VAPID)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              مفاتيح مطلوبة لإرسال التنبيهات عبر متصفحات Chrome/Firefox/Safari على
              الأجهزة المكتبية والأندرويد. يمكنك توليدها عبر مكتبة{' '}
              <code className="bg-muted px-1 rounded" dir="ltr">web-push</code>
              .
            </p>
          </div>

          <div>
            <Label htmlFor="vapid-public">VAPID Public Key</Label>
            <Input
              id="vapid-public"
              value={form.vapid_public_key ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, vapid_public_key: e.target.value }))
              }
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="BNcRdrez..."
            />
          </div>

          <div>
            <Label htmlFor="vapid-private">VAPID Private Key</Label>
            <Input
              id="vapid-private"
              type="password"
              value={form.vapid_private_key ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, vapid_private_key: e.target.value }))
              }
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder={config.has_vapid_private_key ? '••••••••' : ''}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              اتركه فارغاً للاحتفاظ بالمفتاح الحالي
            </p>
          </div>

          <div>
            <Label htmlFor="vapid-subject">VAPID Subject</Label>
            <Input
              id="vapid-subject"
              value={form.vapid_subject ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, vapid_subject: e.target.value }))
              }
              dir="ltr"
              className="mt-1"
              placeholder="mailto:support@yourbrand.com"
            />
          </div>
        </div>

        {/* APNs — iOS native */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Apple Push Notification (APNs)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              للأجهزة التي تثبّت البطاقة في Apple Wallet. يتطلّب Apple Developer
              account ومفتاح .p8.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="apns-team">Team ID</Label>
              <Input
                id="apns-team"
                value={form.apns_team_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, apns_team_id: e.target.value }))
                }
                dir="ltr"
                className="mt-1 font-mono text-xs"
                placeholder="ABC1234567"
              />
            </div>
            <div>
              <Label htmlFor="apns-key">Key ID</Label>
              <Input
                id="apns-key"
                value={form.apns_key_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, apns_key_id: e.target.value }))
                }
                dir="ltr"
                className="mt-1 font-mono text-xs"
                placeholder="XYZ9876543"
              />
            </div>
            <div>
              <Label htmlFor="apns-bundle">Bundle ID</Label>
              <Input
                id="apns-bundle"
                value={form.apns_bundle_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, apns_bundle_id: e.target.value }))
                }
                dir="ltr"
                className="mt-1 font-mono text-xs"
                placeholder="com.stamply.wallet"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="apns-key-body">
              APNs Auth Key (.p8)
              {config.has_apns_key && (
                <span className="text-[10px] text-emerald-600 ms-2">✓ محفوظ</span>
              )}
            </Label>
            <Textarea
              id="apns-key-body"
              value={form.apns_key ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, apns_key: e.target.value }))}
              dir="ltr"
              rows={5}
              className="mt-1 font-mono text-[10px]"
              placeholder={
                config.has_apns_key
                  ? '(المفتاح محفوظ — اتركه فارغاً للاحتفاظ به)'
                  : '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
              }
            />
          </div>
        </div>

        {/* FCM — Android native */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Firebase Cloud Messaging (FCM)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              للأجهزة التي تثبّت البطاقة في Google Wallet. يتطلّب Firebase
              project ومفتاح خدمة.
            </p>
          </div>

          <div>
            <Label htmlFor="fcm-project">FCM Project ID</Label>
            <Input
              id="fcm-project"
              value={form.fcm_project_id ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, fcm_project_id: e.target.value }))
              }
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="stamply-abc123"
            />
          </div>

          <div>
            <Label htmlFor="fcm-svc">
              FCM Service Account JSON
              {config.has_fcm_credentials && (
                <span className="text-[10px] text-emerald-600 ms-2">✓ محفوظ</span>
              )}
            </Label>
            <Textarea
              id="fcm-svc"
              value={form.fcm_service_account ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, fcm_service_account: e.target.value }))
              }
              dir="ltr"
              rows={6}
              className="mt-1 font-mono text-[10px]"
              placeholder={
                config.has_fcm_credentials
                  ? '(محفوظ — اتركه فارغاً للاحتفاظ به)'
                  : '{\n  "type": "service_account",\n  ...\n}'
              }
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
            {saveMsg.ok ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {saveMsg.text}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Save className="w-4 h-4 me-1.5" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      </form>

      {/* Templates panel — same 5 events as email/sms, each with its own
          title + body + deep link editable from /admin/settings/push-templates/:key */}
      <div className="rounded-xl border bg-card p-6 mt-6">
        <h2 className="font-semibold mb-1 text-sm">قوالب التنبيهات التلقائية</h2>
        <p className="text-xs text-muted-foreground mb-4">
          خصّص نصوص التنبيهات التي تُرسَل تلقائياً عند أحداث معيّنة (ترحيب، عيد
          ميلاد، تذكير، ...). يمكنك تفعيل/إيقاف كل قالب مستقلاً.
        </p>

        <ul className="space-y-2">
          {(
            [
              {
                key: 'welcome',
                icon: <UserPlus className="w-4 h-4 text-violet-500" />,
                title: 'ترحيبي',
                description: 'تنبيه فور تسجيل العميل بطاقته',
              },
              {
                key: 'birthday',
                icon: <Cake className="w-4 h-4 text-pink-500" />,
                title: 'عيد الميلاد',
                description: 'تهنئة يوم عيد ميلاد العميل',
              },
              {
                key: 'winback',
                icon: <Bell className="w-4 h-4 text-amber-500" />,
                title: 'تذكير العودة',
                description: 'إعادة جذب العملاء غير النشطين',
              },
              {
                key: 'redemption',
                icon: <Gift className="w-4 h-4 text-purple-500" />,
                title: 'تأكيد الاستبدال',
                description: 'إيصال فوري فور صرف مكافأة',
              },
              {
                key: 'campaign',
                icon: <Megaphone className="w-4 h-4 text-emerald-500" />,
                title: 'حملات يدوية',
                description: 'تنبيهات تسويقية تُرسلها يدوياً',
              },
            ] as const
          ).map((ev) => {
            const tpl = templates.find((t) => t.key === ev.key)
            return (
              <PushEventItem
                key={ev.key}
                templateKey={ev.key}
                icon={ev.icon}
                title={ev.title}
                description={ev.description}
                enabled={tpl?.is_enabled ?? true}
                onToggle={(next) => toggleMutation.mutate({ key: ev.key, next })}
                toggling={
                  toggleMutation.isPending && toggleMutation.variables?.key === ev.key
                }
              />
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function PushEventItem({
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
          href={`/admin/settings/push-templates/${templateKey}`}
          label="تحرير محتوى التنبيه"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Switch
                checked={enabled}
                onCheckedChange={(next) => onToggle(next)}
                disabled={toggling}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {enabled ? 'مفعّل — سيُرسَل تلقائياً' : 'موقوف — لن يُرسَل'}
          </TooltipContent>
        </Tooltip>
      </div>
    </li>
  )
}
