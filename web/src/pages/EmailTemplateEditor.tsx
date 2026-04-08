import { useEffect, useState } from 'react'
import { useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { BackButton } from '@/components/ui/back-button'
import {
  Mail,
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
  getEmailTemplate,
  updateEmailTemplate,
  resetEmailTemplate,
  testEmailTemplate,
  toggleEmailTemplate,
} from '@/lib/templatesApi'

/**
 * /admin/settings/email-templates/:key — full editor for a single email template.
 *
 * Uses the shared <MessageContentEditor> for the editor + live preview UX so
 * it stays identical to the broadcast compose page and the SMS template editor.
 */
export default function EmailTemplateEditorPage() {
  const qc = useQueryClient()
  const [, params] = useRoute('/admin/settings/email-templates/:key')
  const key = params?.key ?? ''

  const { data: template, isLoading } = useQuery({
    queryKey: ['email-template', key],
    queryFn: () => getEmailTemplate(key),
    enabled: !!key,
  })

  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [testTo, setTestTo] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (template) {
      setSubject(template.subject)
      setHtml(template.html)
      if (!testTo) setTestTo('faisal@toot.im')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.key])

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3000)
  }

  const saveMutation = useMutation({
    mutationFn: () => updateEmailTemplate(key, { subject, html }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-template', key] })
      qc.invalidateQueries({ queryKey: ['email-templates'] })
      flash(true, 'تم حفظ القالب')
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      flash(false, err.response?.data?.message ?? 'تعذر الحفظ')
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => resetEmailTemplate(key),
    onSuccess: (updated) => {
      setSubject(updated.subject)
      setHtml(updated.html)
      qc.invalidateQueries({ queryKey: ['email-template', key] })
      flash(true, 'تم استعادة القالب الافتراضي')
    },
  })

  const testMutation = useMutation({
    mutationFn: () => testEmailTemplate(key, testTo, { subject, html }),
    onSuccess: (res) => flash(res.ok, res.message),
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'فشل الإرسال'),
  })

  const toggleMutation = useMutation({
    mutationFn: (next: boolean) =>
      toggleEmailTemplate(key, next, { subject, html }),
    onSuccess: (updated) => {
      qc.setQueryData(['email-template', key], updated)
      qc.invalidateQueries({ queryKey: ['email-templates'] })
      flash(true, updated.is_enabled ? 'تم تفعيل الرسالة' : 'تم تعطيل الرسالة')
    },
    onError: () => flash(false, 'تعذر تغيير الحالة'),
  })

  if (isLoading || !template) {
    return <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
  }

  return (
    <div>
      <BackButton href="/admin/settings/integrations/email" label="البريد الإلكتروني" className="mb-3" />

      <header className="mb-6 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Mail className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{template.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Switch
              checked={template.is_enabled}
              onCheckedChange={(next) => toggleMutation.mutate(next)}
              disabled={toggleMutation.isPending}
              aria-label="تفعيل / تعطيل القالب"
            />
            <span className={template.is_enabled ? 'text-foreground' : 'text-muted-foreground'}>
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
        channel="email"
        subject={subject}
        onSubjectChange={setSubject}
        body={html}
        onBodyChange={setHtml}
        variables={template.variables}
        banner={
          msg ? (
            <div
              className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${
                msg.ok
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                  : 'border-destructive/40 bg-destructive/10 text-destructive'
              }`}
            >
              {msg.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msg.text}
            </div>
          ) : null
        }
      />

      {/* Bottom action bar — save + test */}
      <div className="mt-6 rounded-xl border bg-card p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Label htmlFor="test-to" className="text-xs text-muted-foreground shrink-0">
            إرسال اختبار إلى
          </Label>
          <Input
            id="test-to"
            type="email"
            dir="ltr"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testTo}
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Send className="w-4 h-4 me-1.5" />
            )}
            إرسال اختبار
          </Button>
        </div>

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
  )
}
