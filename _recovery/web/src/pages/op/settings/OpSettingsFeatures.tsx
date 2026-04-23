import { useState } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Settings,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { BackButton } from '@/components/ui/back-button'
import {
  getPlatformFeatures,
  updatePlatformFeatures,
  type PlatformFeatures,
} from '@/lib/api/op/settings'

export default function OpSettingsFeaturesPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['op-settings', 'features'],
    queryFn: getPlatformFeatures,
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
      <h1 className="text-2xl font-bold mb-6">خصائص المنصة</h1>

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

      <FeaturesForm features={data} flash={flash} qc={qc} />
    </div>
  )
}

function FeaturesForm({
  features,
  flash,
  qc,
}: {
  features: PlatformFeatures
  flash: (ok: boolean, text: string) => void
  qc: ReturnType<typeof useQueryClient>
}) {
  const [form, setForm] = useState<PlatformFeatures>({
    phone_verification: features.phone_verification,
  })

  const saveMutation = useMutation({
    mutationFn: () => updatePlatformFeatures(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-settings', 'features'] })
      flash(true, 'تم حفظ خصائص المنصة')
    },
    onError: () => flash(false, 'تعذر حفظ الخصائص'),
  })

  return (
    <section className="rounded-xl border bg-card p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-neutral-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">خصائص المنصة</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تحكّم بالخصائص التي تؤثّر على سلوك المنصة لجميع التجار.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
          <input
            id="feat-phone-verification"
            type="checkbox"
            checked={form.phone_verification}
            onChange={(e) =>
              setForm({ ...form, phone_verification: e.target.checked })
            }
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <div className="flex-1 min-w-0">
            <Label
              htmlFor="feat-phone-verification"
              className="text-xs font-medium cursor-pointer"
            >
              التحقق من رقم الجوال (OTP)
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              عند التفعيل، يظهر للعميل طلب تأكيد رقم الجوال بعد التسجيل في صفحة البطاقة العامة.
              عند التعطيل، لن يُطلب أي تحقق.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin me-1.5" />
          ) : (
            <Check className="w-4 h-4 me-1.5" />
          )}
          حفظ الخصائص
        </Button>
      </div>
    </section>
  )
}
