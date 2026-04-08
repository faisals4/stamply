import { useEffect, useState } from 'react'
import { useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { BackButton } from '@/components/ui/back-button'
import {
  Smartphone,
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
import { renderWithSampleVars } from '@/components/messaging/sample-vars'
import {
  getSmsTemplate,
  updateSmsTemplate,
  resetSmsTemplate,
  testSmsTemplate,
  toggleSmsTemplate,
} from '@/lib/api/sms-templates'

/**
 * /admin/settings/sms-templates/:key — editor for a single SMS template.
 *
 * Uses the shared <MessageContentEditor> for the editor + phone-mockup live
 * preview. The page only adds template-specific chrome: header, enable
 * switch, reset button, save + test send action bar.
 */
export default function SmsTemplateEditorPage() {
  const qc = useQueryClient()
  const [, params] = useRoute('/admin/settings/sms-templates/:key')
  const key = params?.key ?? ''

  const { data: template, isLoading } = useQuery({
    queryKey: ['sms-template', key],
    queryFn: () => getSmsTemplate(key),
    enabled: !!key,
  })

  const [body, setBody] = useState('')
  const [testTo, setTestTo] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (template) setBody(template.body)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.key])

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3000)
  }

  const saveMutation = useMutation({
    mutationFn: () => updateSmsTemplate(key, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms-template', key] })
      qc.invalidateQueries({ queryKey: ['sms-templates'] })
      flash(true, 'تم حفظ القالب')
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      flash(false, err.response?.data?.message ?? 'تعذر الحفظ')
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => resetSmsTemplate(key),
    onSuccess: (updated) => {
      setBody(updated.body)
      qc.invalidateQueries({ queryKey: ['sms-template', key] })
      flash(true, 'تم استعادة القالب الافتراضي')
    },
  })

  const testMutation = useMutation({
    mutationFn: () => testSmsTemplate(key, testTo, { body }),
    onSuccess: (res) => flash(res.ok, res.message),
    onError: (err: AxiosError<{ message?: string }>) =>
      flash(false, err.response?.data?.message ?? 'فشل الإرسال'),
  })

  const toggleMutation = useMutation({
    mutationFn: (next: boolean) => toggleSmsTemplate(key, next, body),
    onSuccess: (updated) => {
      qc.setQueryData(['sms-template', key], updated)
      qc.invalidateQueries({ queryKey: ['sms-templates'] })
      flash(true, updated.is_enabled ? 'تم تفعيل الرسالة' : 'تم تعطيل الرسالة')
    },
    onError: () => flash(false, 'تعذر تغيير الحالة'),
  })

  if (isLoading || !template) {
    return <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
  }

  // SMS segmentation calc — 160 ASCII / 70 Unicode per segment.
  const rendered = renderWithSampleVars(body)
  const hasUnicode = /[^\x00-\x7F]/.test(rendered)
  const segmentLen = hasUnicode ? 70 : 160
  const segments = Math.max(1, Math.ceil(rendered.length / segmentLen))

  return (
    <div>
      <BackButton href="/admin/settings/integrations/sms" label="الرسائل النصية" className="mb-3" />

      <header className="mb-6 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Smartphone className="w-6 h-6 text-indigo-600" />
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
        channel="sms"
        body={body}
        onBodyChange={setBody}
        variables={template.variables}
        smsFromNumber="+12605303702"
        bodyHelper={
          <span>
            {rendered.length} حرف — {segments} {segments === 1 ? 'مقطع' : 'مقاطع'}
            {segments > 1 && (
              <span className="text-amber-600 ms-2">
                ⚠ سيُحتسب كأكثر من رسالة SMS واحدة
              </span>
            )}
          </span>
        }
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

      {/* Bottom action bar — save + test send */}
      <div className="mt-6 rounded-xl border bg-card p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Label htmlFor="test-to-sms" className="text-xs text-muted-foreground shrink-0">
            إرسال اختبار إلى
          </Label>
          <Input
            id="test-to-sms"
            type="tel"
            dir="ltr"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="+966555..."
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
