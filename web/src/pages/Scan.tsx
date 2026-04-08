import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { ScanLine, Plus, Minus, Gift, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { cashierLookup, giveStamp, removeStamp, redeemReward } from '@/lib/phase1Api'
import type { CashierCardView } from '@/types/customer'
import { CardVisual } from '@/components/card/CardVisual'
import type { CardTemplate, CardReward } from '@/types/card'

/**
 * /scan — cashier workflow. In Phase 1 the serial is typed manually or pasted
 * from a QR reader. Phase 2 adds camera + QR library.
 */
export default function ScanPage() {
  const qc = useQueryClient()
  const [serialInput, setSerialInput] = useState('')
  const [card, setCard] = useState<CashierCardView | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const flashError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 4000)
  }

  const lookupMutation = useMutation({
    mutationFn: cashierLookup,
    onSuccess: (data) => {
      setCard(data)
      setErrorMsg(null)
    },
    onError: (err: AxiosError) => {
      setCard(null)
      flashError(
        err.response?.status === 404 ? 'البطاقة غير موجودة' : 'تعذر العثور على البطاقة',
      )
    },
  })

  // After a successful action we hide the corresponding block and show a
  // success message in its place. Prevents the cashier from double-clicking.
  const [justRedeemedName, setJustRedeemedName] = useState<string | null>(null)
  const [justGivenCount, setJustGivenCount] = useState<number | null>(null)
  const [justRemovedCount, setJustRemovedCount] = useState<number | null>(null)

  const giveMutation = useMutation({
    mutationFn: ({ serial, count }: { serial: string; count: number }) =>
      giveStamp(serial, count),
    onSuccess: (data, vars) => {
      setCard(data)
      setJustGivenCount(vars.count)
      showToast(`تم إضافة الطابع ✓`)
      qc.invalidateQueries({ queryKey: ['issued', data.serial_number] })
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      flashError(err.response?.data?.message || 'تعذر إضافة الطابع')
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ serial, count }: { serial: string; count: number }) =>
      removeStamp(serial, count),
    onSuccess: (data, vars) => {
      setCard(data)
      setJustRemovedCount(vars.count)
      showToast(`تم خصم الطابع ✓`)
      qc.invalidateQueries({ queryKey: ['issued', data.serial_number] })
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      flashError(err.response?.data?.message || 'تعذر خصم الطابع')
    },
  })

  const redeemMutation = useMutation({
    mutationFn: ({
      serial,
      rewardId,
    }: {
      serial: string
      rewardId: number
      rewardName: string
    }) => redeemReward(serial, rewardId),
    onSuccess: (data, vars) => {
      setCard(data)
      setJustRedeemedName(vars.rewardName)
      showToast('تم صرف المكافأة 🎁')
      qc.invalidateQueries({ queryKey: ['issued', data.serial_number] })
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      flashError(err.response?.data?.message || 'تعذر صرف المكافأة')
    },
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleLookup = (e: FormEvent) => {
    e.preventDefault()
    const s = serialInput.trim().toUpperCase()
    if (!s) return
    lookupMutation.mutate(s)
  }

  const reset = () => {
    setCard(null)
    setSerialInput('')
    setJustRedeemedName(null)
    setJustGivenCount(null)
    setJustRemovedCount(null)
  }

  const busy =
    lookupMutation.isPending ||
    giveMutation.isPending ||
    removeMutation.isPending ||
    redeemMutation.isPending

  return (
    <div>
      <PageHeader
        icon={<ScanLine />}
        title="ماسح الكاشير"
        subtitle="امسح رمز البطاقة أو أدخل الرقم التسلسلي يدوياً لإضافة طابع أو صرف مكافأة"
      />

      {toast && (
        <div className="fixed top-4 start-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top">
          {toast}
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-4 start-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top">
          {errorMsg}
        </div>
      )}

      {!card ? (
        /* Lookup form */
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-card rounded-2xl border p-6">
            <div className="flex flex-col items-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <ScanLine className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-semibold">البحث عن بطاقة</h2>
              <p className="text-xs text-muted-foreground mt-1">
                أدخل الرقم التسلسلي كما يظهر على البطاقة
              </p>
            </div>
            <form onSubmit={handleLookup} className="space-y-3">
              <Input
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="XXXXXXXXXXXX"
                className="text-center font-mono tracking-widest uppercase"
                dir="ltr"
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={busy || !serialInput.trim()}>
                {lookupMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                    جارٍ البحث...
                  </>
                ) : (
                  'بحث'
                )}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        /* Card actions */
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 lg:gap-6">
          {/* Card visual */}
          <div className="space-y-3">
            <CardVisual
              card={{
                name: card.template.name,
                design: card.template.design,
                rewards: card.template.rewards.map(
                  (r): CardReward => ({
                    id: String(r.id),
                    name: r.name,
                    stampsRequired: r.stamps_required,
                  }),
                ),
              } as unknown as CardTemplate}
              collectedStamps={card.stamps_count}
              customerName={card.customer.name}
              qrValue={card.serial_number}
            />
            <Button variant="outline" className="w-full" onClick={reset}>
              بطاقة أخرى
            </Button>
          </div>

          {/* Actions panel */}
          <div className="space-y-4">
            {/* Customer info */}
            <div className="bg-card rounded-xl border p-5">
              <div className="text-xs text-muted-foreground mb-1">العميل</div>
              <div className="text-lg font-semibold">{card.customer.name}</div>
              <div className="text-sm text-muted-foreground font-mono mt-0.5" dir="ltr">
                {card.customer.phone}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {card.stamps_count} طوابع
                </Badge>
              </div>
            </div>

            {/* Give stamps — replaced with success block right after a
                successful add to prevent accidental double-clicks */}
            {justGivenCount !== null ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-emerald-900">
                      تم إضافة {justGivenCount}{' '}
                      {justGivenCount === 1 ? 'طابع' : justGivenCount === 2 ? 'طابعين' : 'طوابع'} ✓
                    </div>
                    <div className="text-xs text-emerald-800/80 mt-0.5">
                      الرصيد الحالي: {card.stamps_count} طوابع
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full bg-transparent border-emerald-300 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
                  onClick={() => setJustGivenCount(null)}
                >
                  إضافة طابع آخر
                </Button>
              </div>
            ) : (
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">إضافة طابع</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map((n) => (
                    <Button
                      key={n}
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        giveMutation.mutate({ serial: card.serial_number, count: n })
                      }
                    >
                      +{n}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Remove stamps — same pattern */}
            {justRemovedCount !== null ? (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Check className="w-6 h-6 text-red-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-red-900">
                      تم خصم {justRemovedCount}{' '}
                      {justRemovedCount === 1 ? 'طابع' : justRemovedCount === 2 ? 'طابعين' : 'طوابع'} ✓
                    </div>
                    <div className="text-xs text-red-800/80 mt-0.5">
                      الرصيد الحالي: {card.stamps_count} طوابع
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full bg-transparent border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900"
                  onClick={() => setJustRemovedCount(null)}
                >
                  خصم طابع آخر
                </Button>
              </div>
            ) : (
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Minus className="w-4 h-4 text-red-500" />
                  <h3 className="font-semibold">خصم طابع</h3>
                  <span className="text-[11px] text-muted-foreground">
                    — لإلغاء إضافة خاطئة
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map((n) => (
                    <Button
                      key={n}
                      variant="outline"
                      disabled={busy || card.stamps_count < n}
                      onClick={() =>
                        removeMutation.mutate({ serial: card.serial_number, count: n })
                      }
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    >
                      −{n}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards — hidden for a few seconds after a successful redemption
                so the cashier doesn't accidentally double-click صرف */}
            {justRedeemedName ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-emerald-900">
                      تم صرف المكافأة بنجاح
                    </div>
                    <div className="text-xs text-emerald-800/80 mt-0.5">
                      {justRedeemedName} — خُصمت الطوابع من البطاقة
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full bg-transparent border-emerald-300 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
                  onClick={() => setJustRedeemedName(null)}
                >
                  إظهار المكافآت
                </Button>
              </div>
            ) : (
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold">المكافآت</h3>
                </div>
                {card.template.rewards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد مكافآت معرّفة</p>
                ) : (
                  <ul className="space-y-2">
                    {card.template.rewards.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium text-sm">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            تحتاج {r.stamps_required} طوابع
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={busy || !r.can_redeem}
                          onClick={() =>
                            redeemMutation.mutate({
                              serial: card.serial_number,
                              rewardId: r.id,
                              rewardName: r.name,
                            })
                          }
                        >
                          {r.can_redeem ? (
                            <>
                              <Check className="w-3.5 h-3.5 me-1" />
                              صرف
                            </>
                          ) : (
                            'غير متاح'
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
