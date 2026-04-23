import { useState, type FormEvent } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Smartphone,
  KeyRound,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/ui/back-button'
import {
  getPlatformPushSettings,
  updatePlatformFcm,
} from '@/lib/api/op/settings'

export default function OpSettingsFcmPage() {
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

  if (isLoading || !data) {
    return <FullPageLoader />
  }

  return (
    <div className="max-w-3xl">
      <BackButton href="/op/settings" />
      <h1 className="text-2xl font-bold mb-6">Firebase (FCM)</h1>

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

      <FcmForm fcm={data.fcm} flash={flash} qc={qc} />
    </div>
  )
}

function FcmForm({
  fcm,
  flash,
  qc,
}: {
  fcm: { project_id: string; has_service_account: boolean }
  flash: (ok: boolean, text: string) => void
  qc: ReturnType<typeof useQueryClient>
}) {
  const [form, setForm] = useState({
    project_id: fcm.project_id,
    service_account: '',
  })

  const saveMutation = useMutation({
    mutationFn: () => updatePlatformFcm(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-settings', 'push'] })
      flash(true, 'تم حفظ إعدادات FCM')
      setForm((f) => ({ ...f, service_account: '' }))
    },
    onError: () => flash(false, 'تعذر حفظ FCM'),
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
