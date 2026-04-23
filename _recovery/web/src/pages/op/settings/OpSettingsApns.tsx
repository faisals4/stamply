import { useState, type FormEvent } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Apple,
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
  updatePlatformApns,
} from '@/lib/api/op/settings'

export default function OpSettingsApnsPage() {
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
      <h1 className="text-2xl font-bold mb-6">Apple Push (APNs)</h1>

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

      <ApnsForm apns={data.apns} flash={flash} qc={qc} />
    </div>
  )
}

function ApnsForm({
  apns,
  flash,
  qc,
}: {
  apns: { team_id: string; key_id: string; bundle_id: string; has_key: boolean }
  flash: (ok: boolean, text: string) => void
  qc: ReturnType<typeof useQueryClient>
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
      qc.invalidateQueries({ queryKey: ['op-settings', 'push'] })
      flash(true, 'تم حفظ إعدادات APNs')
      setForm((f) => ({ ...f, key_body: '' }))
    },
    onError: () => flash(false, 'تعذر حفظ APNs'),
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
