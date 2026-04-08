import { useEffect, useState } from 'react'
import { useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { BackButton } from '@/components/ui/back-button'
import {
  Bell,
  Save,
  Send,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MessageContentEditor } from '@/components/messaging/MessageContentEditor'
import {
  getPushTemplate,
  updatePushTemplate,
  resetPushTemplate,
  testPushTemplate,
  togglePushTemplate,
} from '@/lib/api/push-templates'

/**
 * /admin/settings/push-templates/:key — editor for a single push template.
 *
 * Mirrors SmsTemplateEditor but exposes three fields (title, body, optional
 * URL) and uses the `push` channel variant of MessageContentEditor for the
 * live notification-banner preview.
 *
 * The URL field is an optional deep link that the service worker opens
 * when the customer taps the notification.
 */
export default function PushTemplateEditorPage() {
  const qc = useQueryClient()
  const [, params] = useRoute('/admin/settings/push-templates/:key')
  const key = params?.key ?? ''

  const { data: template, isLoading } = useQuery({
    queryKey: ['push-template', key],
    queryFn: () => getPushTemplate(key),
    enabled: !!key,
  })

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (template) {
      setTitle(template.title)
      setBody(template.body)
      setUrl(template.url ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.key])

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      updatePushTemplate(key, { title, body, url: url || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['push-template', key] })
      qc.invalidateQueries({ queryKey: ['push-templates'] })
      flash(true, 'تم حفظ القالب')
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      flash(false, err.response?.data?.message ?? 'تعذر الحفظ')
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => resetPushTemplate(key),
    onSuccess: (updated) => {
      setTitle(updated.title)
      setBody(updated.body)
      setUrl(updated.url ?? '')
      qc.invalidateQueries({ queryKey: ['push-template', key] })
      flash(true, 'تم استعادة القالب الافتراضي')
    },
  })

  const testMutation = useMutation({
    mutationFn: () => testPushTemplate(key, { title, body, url: url || undefined }),
    onSuccess: (res) => flash(res.ok, res.message),
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'فشل الإرسال'),
  })

  const toggleMutation = useMutation({
    mutationFn: (next: boolean) =>
      togglePushTemplate(key, next, {
        title,
        body,
        url: url || null,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(['push-template', key], updated)
      qc.invalidateQueries({ queryKey: ['push-templates'] })
      flash(
        true,
        updated.is_enabled ? 'تم تفعيل التنبيه' : 'تم تعطيل التنبيه',
      )
    },
    onError: () => flash(false, 'تعذر تغيير الحالة'),
  })

  if (isLoading || !template) {
    return <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
  }

  // Rough character budget — most OS banners show ~40 chars of title and
  // ~120 chars of body before truncating.
  const titleOver = title.length > 40
  const bodyOver = body.length > 120

  return (
    <div>
      <BackButton
        href="/admin/settings/integrations/push"
        label="التنبيهات"
        className="mb-3"
      />

      <header className="mb-6 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Bell className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {template.description}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Switch
              checked={template.is_enabled}
              onCheckedChange={(next) => toggleMutation.mutate(next)}
              disabled={toggleMutation.isPending}
              aria-label="تفعيل / تعطيل القالب"
            />
            <span
              className={
                template.is_enabled ? 'text-foreground' : 'text-muted-foreground'
              }
            >
              {template.is_enabled ? 'مفعّل' : 'معطّل'}
            </span>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('استعادة القالب الافتراضي؟ سيتم فقدان أي تعديلات.')) {
                resetMutation.mutate()
              }
            }}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="w-3.5 h-3.5 me-1.5" />
            استعادة
          </Button>
        </div>
      </header>

      <MessageContentEditor
        channel="push"
        subject={title}
        onSubjectChange={setTitle}
        body={body}
        onBodyChange={setBody}
        variables={template.variables}
        bodyHelper={
          <span>
            {body.length} حرف{' '}
            {bodyOver && (
              <span className="text-amber-600 ms-2">
                ⚠ أطول من 120 حرف — قد يُقتطع على بعض الأجهزة
              </span>
            )}
          </span>
        }
        banner={
          <>
            {titleOver && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-900 px-3 py-2 text-xs">
                ⚠ عنوان التنبيه أطول من 40 حرف — iOS قد يقتطعه
              </div>
            )}
            {msg && (
              <div
                className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${
                  msg.ok
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                    : 'border-destructive/40 bg-destructive/10 text-destructive'
                }`}
              >
                {msg.ok ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {msg.text}
              </div>
            )}
          </>
        }
      />

      {/* Optional deep link — sits below the editor, above the action bar */}
      <div className="mt-6 rounded-xl border bg-card p-5">
        <Label htmlFor="tpl-url" className="text-sm">
          رابط الانتقال (اختياري)
        </Label>
        <p className="text-[11px] text-muted-foreground mb-2">
          عند نقر العميل على التنبيه، يفتح هذا الرابط. اتركه فارغاً لفتح صفحة
          البطاقة الخاصة به. يدعم المتغيرات مثل{' '}
          <code className="bg-muted px-1 rounded font-mono" dir="ltr">
            {'{{card.install_url}}'}
          </code>
          .
        </p>
        <Input
          id="tpl-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          dir="ltr"
          placeholder="https://..."
          className="font-mono text-xs"
        />
      </div>

      {/* Bottom action bar — save + test */}
      <div className="mt-6 rounded-xl border bg-card p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 text-xs text-muted-foreground">
          اختبار الإرسال يستخدم أوّل عميل لديه اشتراك تنبيهات نشط
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Send className="w-4 h-4 me-1.5" />
            )}
            إرسال اختبار
          </Button>

          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Save className="w-4 h-4 me-1.5" />
            )}
            حفظ
          </Button>
        </div>
      </div>
    </div>
  )
}
