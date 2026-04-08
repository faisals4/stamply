import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Wallet,
  Send,
  Loader2,
  AlertCircle,
  Check,
  Smartphone,
  Info,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import {
  announceCard,
  announceAllCards,
  type AnnounceResult,
  type AnnounceAllResult,
} from '@/lib/phase1Api'
import { listCardsApi } from '@/lib/cardsApi'
import { AnnouncementPreview } from './AnnouncementPreview'

const MAX_CHARS = 500

/**
 * /admin/wallet/announce — push a short message to Apple Wallet pass
 * holders. Two modes:
 *   - Single card: enter the serial, get a notification on one device
 *   - Broadcast: every active card in the tenant gets the same message
 *
 * Apple Wallet doesn't have a "send notification" API in the usual
 * sense — instead, when a back-field value changes between pass
 * updates, iOS automatically pops a lock-screen notification with the
 * new value. Our backend writes the message to the announcement back
 * field, bumps `pass_updated_at`, and APNs picks up from there.
 */
export default function WalletAnnouncePage() {
  const [mode, setMode] = useState<'single' | 'broadcast'>('broadcast')
  const [serial, setSerial] = useState('')
  const [message, setMessage] = useState('')
  /** Empty array = broadcast to every card in the tenant. One or more
   *  template IDs = narrow to customers who hold those specific cards. */
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [result, setResult] = useState<{
    devices?: number
    cards?: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load the tenant's card templates once so the merchant can pick
  // which cardholders the broadcast should target.
  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: listCardsApi,
    staleTime: 60_000,
  })

  const sendMutation = useMutation<AnnounceResult | AnnounceAllResult, AxiosError>({
    mutationFn: () => {
      setError(null)
      setResult(null)
      if (mode === 'single') {
        return announceCard(serial.trim(), message.trim())
      }
      // Broadcast — convert selected string IDs to numbers. Empty
      // array → backend defaults to "all tenant cards".
      const templateIds = selectedTemplateIds
        .map((s) => Number.parseInt(s, 10))
        .filter((n) => Number.isFinite(n) && n > 0)
      return announceAllCards(message.trim(), templateIds)
    },
    onSuccess: (data) => {
      if ('sent_to_devices' in data) {
        setResult({ devices: data.sent_to_devices })
      } else {
        setResult({ cards: data.cards_updated })
      }
      setMessage('')
    },
    onError: (err) => {
      const msg =
        (err.response?.data as { message?: string })?.message ??
        'تعذّر إرسال الإعلان'
      setError(msg)
    },
  })

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  const targetAll = selectedTemplateIds.length === 0

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('الرسالة فارغة')
      return
    }
    if (mode === 'single' && !serial.trim()) {
      setError('رقم البطاقة (Serial) مطلوب')
      return
    }
    sendMutation.mutate()
  }

  const charsLeft = MAX_CHARS - message.length

  return (
    <div>
      <PageHeader
        title="إعلانات Apple Wallet"
        description="ابعث رسالة فورية لمحملي البطاقات — تظهر كإشعار على شاشة قفل iPhone."
        icon={<Wallet />}
      />

      {/* How it works */}
      <div className="rounded-lg border bg-muted/30 p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
          <p>
            تظهر الرسالة كـ <strong>إشعار على شاشة قفل iPhone</strong> خلال ثوانٍ،
            وتبقى محفوظة في خلف البطاقة. تصل فقط للعملاء الذين أضافوا البطاقة
            إلى Apple Wallet.
          </p>
          <p>
            <strong>ملاحظة:</strong> التحديثات التي تتم على البطاقة لن تظهر
            كتنبيهات فورية، وإنما يمكن للعميل الاطلاع عليها داخل البطاقة (في
            الخلف)، وذلك وفقًا لسياسات Apple Wallet.
          </p>
        </div>
      </div>

      {/* Two-column layout matching the card editor (Editor.tsx):
          content column grows, preview column is a fixed 340px that
          sticks to the top. `min-w-0` on the form column stops long
          content from forcing horizontal scroll. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="min-w-0">

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          type="button"
          onClick={() => setMode('broadcast')}
          className={`rounded-lg border-2 p-4 text-start transition-colors ${
            mode === 'broadcast'
              ? 'border-primary bg-primary/5'
              : 'border-input bg-card hover:border-muted-foreground/30'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4" />
            <span className="font-semibold text-sm">بثّ لكل العملاء</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            إرسال نفس الإعلان لكل بطاقة نشطة في النشاط
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`rounded-lg border-2 p-4 text-start transition-colors ${
            mode === 'single'
              ? 'border-primary bg-primary/5'
              : 'border-input bg-card hover:border-muted-foreground/30'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4" />
            <span className="font-semibold text-sm">عميل واحد</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            إرسال إعلان لبطاقة واحدة عبر رقمها (Serial)
          </p>
        </button>
      </div>

      {/* Fixed min-height so the form doesn't visually jump when
          switching between "single" (short — just a Serial input) and
          "broadcast" (taller — card picker list). The min-h covers the
          tallest variant so both modes render at the same page height. */}
      <form onSubmit={onSubmit} className="space-y-4 lg:min-h-[440px]">
        {mode === 'single' && (
          <div>
            <Label htmlFor="serial" className="text-xs">
              رقم البطاقة (Serial)
            </Label>
            <Input
              id="serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="T3H9KJVDVWRR"
              dir="ltr"
              className="mt-1 font-mono"
            />
          </div>
        )}

        {/* Card template picker — only shown in broadcast mode. When
            nothing is selected the broadcast reaches every active card
            in the tenant. Selecting one or more cards narrows the
            broadcast to holders of those templates only. */}
        {mode === 'broadcast' && cards.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">البطاقات المستهدفة</Label>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {targetAll
                  ? `كل البطاقات (${cards.length})`
                  : `${selectedTemplateIds.length} / ${cards.length}`}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              اتركها فارغة لإرسال الإعلان لكل حاملي البطاقات في النشاط، أو
              اختر بطاقة أو أكثر لقصر الإرسال على حامليها فقط.
            </p>
            <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
              {/* "All" row — deselects everything */}
              <button
                type="button"
                onClick={() => setSelectedTemplateIds([])}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-start transition',
                  targetAll && 'bg-primary/5',
                  'hover:bg-muted/50',
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition',
                    targetAll
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-input',
                  )}
                >
                  {targetAll && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">كل البطاقات</div>
                  <div className="text-[11px] text-muted-foreground">
                    يصل الإعلان لكل حامل بطاقة نشطة في النشاط
                  </div>
                </div>
              </button>

              {/* Individual templates */}
              {cards.map((card) => {
                const selected = selectedTemplateIds.includes(card.id)
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => toggleTemplate(card.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-start transition',
                      selected && 'bg-primary/5',
                      'hover:bg-muted/50',
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition',
                        selected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input',
                      )}
                    >
                      {selected && (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      )}
                    </div>
                    <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {card.name}
                      </div>
                      {card.description && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {card.description}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="message" className="text-xs">
              نص الإعلان
            </Label>
            <span
              className={`text-[11px] tabular-nums ${
                charsLeft < 50 ? 'text-amber-600' : 'text-muted-foreground'
              }`}
            >
              {charsLeft} / {MAX_CHARS}
            </span>
          </div>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
            placeholder="مثال: عرض الجمعة - كل قهوة بنصف السعر! 🎉"
            rows={5}
            className="resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            الحد الأقصى {MAX_CHARS} حرف. النص الذي يظهر في الإشعار هو نفس النص
            هنا بدون أي إضافات.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex gap-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              تم إرسال الإعلان بنجاح
              {result.devices !== undefined && ` لـ ${result.devices} جهاز`}
              {result.cards !== undefined && ` لـ ${result.cards} بطاقة نشطة`}.
              ستصل الإشعارات خلال ثوانٍ قليلة.
            </span>
          </div>
        )}

        <Button
          type="submit"
          disabled={sendMutation.isPending || !message.trim()}
          className="w-full sm:w-auto"
        >
          {sendMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
              جارٍ الإرسال...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 me-1.5" />
              {mode === 'single'
                ? 'إرسال للعميل'
                : targetAll
                  ? 'بثّ لكل العملاء'
                  : `بثّ لحاملي ${selectedTemplateIds.length === 1 ? 'بطاقة واحدة' : `${selectedTemplateIds.length} بطاقات`}`}
            </>
          )}
        </Button>
      </form>
        </div>

        {/* Live animated preview — sticks to the top of the right column
            on large screens so it stays visible while the merchant scrolls
            through the form on the left. */}
        <div className="lg:sticky lg:top-6">
          <AnnouncementPreview message={message} />
        </div>
      </div>
    </div>
  )
}
