import { Lock } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { Button } from '@/components/ui/button'

export interface SubscriptionExpiredProps {
  error: string
  plan: string
  expired_at: string
  is_trial: boolean
  message: string
  trial_started_at?: string
  trial_days_total?: number
  trial_days_used?: number
  subscription_starts_at?: string
  onLogout: () => void
}

export default function SubscriptionExpired({
  error,
  plan,
  expired_at,
  is_trial,
  message,
  trial_started_at,
  trial_days_total = 14,
  onLogout,
}: SubscriptionExpiredProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="rounded-2xl border bg-card shadow-lg p-8 text-center space-y-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
            <Lock className="w-8 h-8 text-red-600" />
          </div>

          {/* Heading */}
          {is_trial ? (
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">اشتراكك التجريبي انتهى</h1>
              <p className="text-sm text-muted-foreground">
                للأسف، انتهت فترة التجربة المجانية الخاصة بك
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">اشتراكك في خطة {plan} انتهى</h1>
              <p className="text-sm text-muted-foreground">
                انتهى اشتراكك بتاريخ {formatDate(expired_at)}
              </p>
            </div>
          )}

          {/* Details */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            {is_trial && trial_started_at ? (
              <>
                <p className="text-muted-foreground">
                  بدأت تجربتك في
                  <span className="font-semibold text-foreground ms-1">
                    {formatDate(trial_started_at)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  واستمرت
                  <span className="font-semibold text-foreground ms-1">
                    {trial_days_total} يوم
                  </span>
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                يمكنك تجديد اشتراكك الآن للوصول إلى جميع الميزات والمزايا
              </p>
            )}
          </div>

          {/* Message (if provided) */}
          {message && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
              <p className="text-sm text-orange-900">{message}</p>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                const text = is_trial
                  ? 'أود ترقية اشتراكي من التجربة المجانية'
                  : `أود تجديد اشتراكي في خطة ${plan}`
                window.open(
                  `https://wa.me/966XXXXXXXXX?text=${encodeURIComponent(text)}`,
                  '_blank',
                )
              }}
              className="w-full"
            >
              تواصل مع الدعم لتجديد اشتراكك
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={onLogout}
              className="w-full"
            >
              تسجيل الخروج
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>إذا كان لديك أي استفسارات، تواصل معنا عبر واتساب</p>
          </div>
        </div>
      </div>
    </div>
  )
}
