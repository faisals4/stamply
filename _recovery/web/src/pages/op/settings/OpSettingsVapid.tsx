import { useState } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Bell,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackButton } from '@/components/ui/back-button'
import {
  getPlatformPushSettings,
  generatePlatformVapid,
  regeneratePlatformVapid,
  updatePlatformVapid,
} from '@/lib/api/op/settings'

export default function OpSettingsVapidPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['op-settings', 'push'],
    queryFn: getPlatformPushSettings,
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
    return <FullPageLoader />
  }

  return (
    <div className="max-w-3xl">
      <BackButton href="/op/settings" />
      <h1 className="text-2xl font-bold mb-6">Web Push (VAPID)</h1>

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
