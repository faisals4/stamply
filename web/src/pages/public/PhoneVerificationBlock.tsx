import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { ShieldCheck, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { requestPhoneOtp, verifyPhoneOtp } from '@/lib/api/misc'

/**
 * Convert Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits
 * to ASCII 0-9. Customers using Arabic keyboards routinely type the
 * Arabic forms, and the backend expects ASCII `/^\d{4}$/`, so the
 * component normalises at the edge before validation and API calls.
 */
function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
}

/**
 * Phone verification block shown at the bottom of /i/:serial.
 *
 * Flow:
 *   1. Customer lands on the page. The block shows a muted
 *      call-to-action: "قم بتوثيق رقمك" + "إرسال رمز التحقق".
 *   2. Tap the button → POST /public/otp/request. Backend sends a
 *      4-digit SMS code to the phone attached to this card.
 *   3. Four input boxes appear. The customer types the code; the
 *      component auto-submits as soon as all four digits are filled.
 *   4. POST /public/otp/verify. On success the block flips to a
 *      success state ("✓ تم توثيق الرقم") and invalidates the
 *      parent card query so the page re-renders without the prompt.
 *   5. Registration itself was NEVER blocked — this is opt-in.
 *
 * UX choices:
 *   - 4-digit code instead of 6: faster entry, better for mobile.
 *   - Four separate square inputs (Apple-style) instead of one
 *     long input. Auto-focus jumps to the next box on keystroke,
 *     backspace moves back, paste fills all four at once.
 *   - Resend button is disabled for 30 seconds after the first
 *     send (same cooldown the backend enforces) with a live
 *     countdown so the customer knows when to try again.
 *   - Friendly error messages pulled from the backend's `message`
 *     field (Arabic-first).
 */
interface Props {
  serial: string
  /** Only render when phone is not yet verified — parent decides. */
  maskedPhoneHint?: string
}

type Phase = 'idle' | 'code_sent' | 'verifying' | 'verified' | 'error'

export function PhoneVerificationBlock({ serial }: Props) {
  const qc = useQueryClient()
  const [phase, setPhase] = useState<Phase>('idle')
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])
  const [phoneMasked, setPhoneMasked] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  // Countdown timer for the resend cooldown. Backend enforces 30s
  // between sends; we mirror that on the client so the button is
  // clearly disabled instead of throwing a 429 on tap.
  useEffect(() => {
    if (resendCountdown <= 0) return
    const t = window.setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [resendCountdown])

  const requestMutation = useMutation({
    mutationFn: () => requestPhoneOtp(serial),
    onSuccess: (res) => {
      setPhoneMasked(res.phone_masked)
      setPhase('code_sent')
      setError(null)
      setResendCountdown(30)
      setDigits(['', '', '', ''])
      // Focus the first input after a tick so the slide-in animation
      // has started and autofocus isn't stolen by it.
      setTimeout(() => inputRefs.current[0]?.focus(), 60)
    },
    onError: (err: AxiosError) => {
      const data = err.response?.data as { message?: string; retry_after?: number }
      setError(data?.message ?? 'تعذّر إرسال الرمز، حاول مرة أخرى')
      if (data?.retry_after) {
        setResendCountdown(data.retry_after)
      }
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyPhoneOtp(serial, code),
    onSuccess: () => {
      setPhase('verified')
      setError(null)
      // Refresh the parent card query so `phone_verified_at` flips
      // to a real timestamp on the next render and this whole block
      // unmounts cleanly.
      qc.invalidateQueries({ queryKey: ['issued', serial] })
    },
    onError: (err: AxiosError) => {
      const data = err.response?.data as {
        message?: string
        attempts_left?: number
      }
      setError(
        data?.message
          ? data.attempts_left !== undefined
            ? `${data.message} (متبقّي ${data.attempts_left} محاولات)`
            : data.message
          : 'الرمز غير صحيح',
      )
      setPhase('code_sent')
      setDigits(['', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 30)
    },
  })

  const handleDigitChange = (index: number, value: string) => {
    // Arabic-Indic → ASCII first so users typing ٠١٢٣ land in the
    // boxes as 0123. iOS autofill can deliver the full 4-char code
    // in one shot, so both single-char and paste paths share this
    // normaliser + `/\D/` filter.
    const clean = normalizeDigits(value).replace(/\D/g, '')
    if (clean.length === 0) {
      const next = [...digits]
      next[index] = ''
      setDigits(next)
      return
    }

    if (clean.length >= 4) {
      // Full paste / autofill — fill all slots at once and submit.
      const nextDigits = clean.slice(0, 4).split('')
      setDigits([...nextDigits, '', '', '', ''].slice(0, 4))
      inputRefs.current[3]?.blur()
      submitCode(nextDigits.join(''))
      return
    }

    const next = [...digits]
    next[index] = clean[0]
    setDigits(next)

    if (index < 3) {
      inputRefs.current[index + 1]?.focus()
    } else if (next.every((d) => d.length === 1)) {
      submitCode(next.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      // In RTL, ArrowLeft visually moves to the "next" box, but we
      // rely on logical order so the experience matches both
      // directions. Stop default to avoid caret hopping inside the
      // current box.
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const submitCode = (code: string) => {
    if (code.length !== 4) return
    setPhase('verifying')
    verifyMutation.mutate(code)
  }

  // Success state: the block shrinks to a single line and the
  // parent query invalidation causes the whole block to unmount on
  // the next data refresh. The brief pause gives the customer a
  // moment of "yes, it worked" feedback.
  if (phase === 'verified') {
    return (
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-emerald-700" />
        </div>
        <div>
          <div className="text-sm font-bold text-emerald-900">تم توثيق الرقم ✓</div>
          <div className="text-[11px] text-emerald-800">
            شكراً لك — بطاقتك الآن موثّقة
          </div>
        </div>
      </div>
    )
  }

  // Idle state: the muted "prompt me to verify" card. This is what
  // the customer sees immediately after their card is issued.
  if (phase === 'idle') {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">قم بتوثيق رقمك</div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              أرسل لك رمز تحقق عبر رسالة نصية للتأكّد أن الرقم يعود لك.
              هذه الخطوة اختيارية لكنها تحمي حسابك.
            </p>
            {error && (
              <div className="text-[11px] text-destructive mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending}
              className="mt-3 text-xs font-medium text-primary hover:underline disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {requestMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  جارٍ الإرسال...
                </>
              ) : (
                <>إرسال رمز التحقق</>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Code-sent state: four-digit entry boxes + resend countdown.
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">أدخل رمز التحقق</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            تم إرسال رمز من 4 أرقام إلى{' '}
            <span className="font-mono font-semibold" dir="ltr">
              {phoneMasked}
            </span>
          </p>

          {/* Four square inputs, centred in the block. `dir="ltr"`
              on the wrapper keeps keyboard flow predictable even
              when the surrounding page is RTL — numeric codes read
              left-to-right in both directions, and auto-advance
              focus must follow the visual order. `justify-center`
              keeps the row centred inside the parent regardless of
              card width. */}
          <div className="flex gap-2 mt-3 justify-center" dir="ltr">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el
                }}
                type="tel"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={phase === 'verifying'}
                className={cn(
                  'w-11 h-12 rounded-md border text-center text-lg font-bold tabular-nums',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                  'disabled:opacity-60',
                  d && 'bg-primary/5 border-primary/30',
                )}
              />
            ))}
          </div>

          {phase === 'verifying' && (
            <div className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              جارٍ التحقّق...
            </div>
          )}

          {error && phase !== 'verifying' && (
            <div className="text-[11px] text-destructive mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          )}

          {/* Resend button with live countdown. Locked for 30s after
              a successful request to match the backend cooldown. */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => requestMutation.mutate()}
              disabled={resendCountdown > 0 || requestMutation.isPending}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {resendCountdown > 0
                ? `إعادة الإرسال بعد ${resendCountdown}ث`
                : 'إعادة إرسال الرمز'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
