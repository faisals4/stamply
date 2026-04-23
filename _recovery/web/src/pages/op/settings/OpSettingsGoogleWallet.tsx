import { useState, type FormEvent } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Wallet,
  KeyRound,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/ui/back-button'
import {
  getPlatformWalletSettings,
  updatePlatformGoogleWallet,
  type PlatformWalletSettings,
} from '@/lib/api/op/settings'

export default function OpSettingsGoogleWalletPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['op-settings', 'wallet'],
    queryFn: getPlatformWalletSettings,
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
      <h1 className="text-2xl font-bold mb-6">Google Wallet</h1>

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

      <GoogleWalletForm google={data.google} flash={flash} qc={qc} />
    </div>
  )
}

function GoogleWalletForm({
  google,
  flash,
  qc,
}: {
  google: PlatformWalletSettings['google']
  flash: (ok: boolean, text: string) => void
  qc: ReturnType<typeof useQueryClient>
}) {
  const [form, setForm] = useState({
    issuer_id: google.issuer_id,
    class_prefix: google.class_prefix,
    service_account: '',
  })

  const saveMutation = useMutation({
    mutationFn: () => updatePlatformGoogleWallet(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-settings', 'wallet'] })
      flash(true, 'تم حفظ إعدادات Google Wallet')
      setForm((f) => ({ ...f, service_account: '' }))
    },
    onError: () => flash(false, 'تعذر حفظ إعدادات Google Wallet'),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const googleChips: Array<{ label: string; state: 'ok' | 'warn' | 'bad' }> = [
    {
      label: google.issuer_id ? 'Issuer ID محفوظ' : 'لا يوجد Issuer ID',
      state: google.issuer_id ? 'ok' : 'bad',
    },
    {
      label: google.class_prefix ? 'Class Prefix محفوظ' : 'لا يوجد Class Prefix',
      state: google.class_prefix ? 'ok' : 'warn',
    },
    {
      label: google.has_service_account
        ? 'Service Account محفوظ'
        : 'لا يوجد Service Account',
      state: google.has_service_account ? 'ok' : 'bad',
    },
  ]
  const googleReady =
    !!google.issuer_id && !!google.class_prefix && google.has_service_account

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5 text-neutral-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">Google Wallet — اعتمادات الإصدار</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            تحتاج Google Cloud project و Google Wallet API مفعّلة، ثم service
            account مع صلاحية "Wallet Object Issuer". احصل على Issuer ID من{' '}
            <a
              href="https://pay.google.com/business/console"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              dir="ltr"
            >
              Google Pay Business Console
            </a>
            .
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 mb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {googleReady ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          )}
          <span>حالة الإعدادات</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {googleChips.map((chip, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                chip.state === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : chip.state === 'warn'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {chip.state === 'ok' ? (
                <Check className="w-3 h-3" />
              ) : chip.state === 'warn' ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="google-issuer" className="text-xs text-muted-foreground">
              Issuer ID
            </Label>
            <Input
              id="google-issuer"
              value={form.issuer_id}
              onChange={(e) => setForm({ ...form, issuer_id: e.target.value })}
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="3388000000012345678"
            />
          </div>
          <div>
            <Label htmlFor="google-class" className="text-xs text-muted-foreground">
              Class Prefix
            </Label>
            <Input
              id="google-class"
              value={form.class_prefix}
              onChange={(e) => setForm({ ...form, class_prefix: e.target.value })}
              dir="ltr"
              className="mt-1 font-mono text-xs"
              placeholder="stamply_loyalty"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="google-sa" className="text-xs text-muted-foreground">
            Service Account JSON
            {google.has_service_account && (
              <span className="text-[10px] text-emerald-600 ms-2">✓ محفوظ</span>
            )}
          </Label>
          <Textarea
            id="google-sa"
            value={form.service_account}
            onChange={(e) => setForm({ ...form, service_account: e.target.value })}
            dir="ltr"
            rows={7}
            className="mt-1 font-mono text-[10px]"
            placeholder={
              google.has_service_account
                ? '(محفوظ — اتركه فارغاً للاحتفاظ به)'
                : '{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  ...\n}'
            }
          />
        </div>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin me-1.5" />
          ) : (
            <KeyRound className="w-4 h-4 me-1.5" />
          )}
          حفظ إعدادات Google Wallet
        </Button>
      </form>
    </section>
  )
}
