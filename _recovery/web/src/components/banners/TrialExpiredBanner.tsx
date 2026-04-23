import { AlertTriangle, Clock } from 'lucide-react'
import { Link } from 'wouter'
import { Button } from '@/components/ui/button'
import type { SubscriptionExpiredData } from '@/lib/auth/auth'

const SUPPORT_PHONE = '966XXXXXXXXX'


function openWhatsApp(text: string) {
  window.open(
    `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`,
    '_blank',
  )
}

/**
 * Shown when the subscription has fully expired.
 */
export function TrialExpiredBanner({ data }: { data: SubscriptionExpiredData }) {
  const whatsappText = data.is_trial
    ? 'أود ترقية اشتراكي من التجربة المجانية'
    : `أود تجديد اشتراكي في خطة ${data.plan}`

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-100 shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-900">
            {data.is_trial ? 'انتهت فترة التجربة المجانية' : 'انتهى اشتراكك'}
          </p>
          <p className="text-xs text-red-700 mt-1 leading-relaxed">
            {data.message}
          </p>

        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link href="/admin/subscription" className="flex-1 sm:flex-initial">
            <Button variant="ghost" size="sm" className="w-full text-red-700 hover:text-red-900 hover:bg-red-100">
              التفاصيل
            </Button>
          </Link>
          <Button
            size="sm"
            className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white"
            onClick={() => openWhatsApp(whatsappText)}
          >
            تواصل مع الدعم
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Shown when the subscription is about to expire (within 15 days).
 */
export function SubscriptionExpiringBanner({ daysRemaining }: { daysRemaining: number }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 shrink-0">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">
            باقي على انتهاء اشتراكك
            <span className="inline-flex items-center justify-center bg-amber-200 text-amber-800 rounded-md px-2 py-0.5 mx-1.5 font-bold text-sm tabular-nums">
              {daysRemaining}
            </span>
            يوم
          </p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            جدّد اشتراكك قبل انتهاء الفترة لضمان استمرار الخدمة بدون انقطاع
          </p>

        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link href="/admin/subscription" className="flex-1 sm:flex-initial">
            <Button variant="ghost" size="sm" className="w-full text-amber-700 hover:text-amber-900 hover:bg-amber-100">
              التفاصيل
            </Button>
          </Link>
          <Button
            size="sm"
            className="flex-1 sm:flex-initial bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => openWhatsApp('أود تجديد اشتراكي')}
          >
            تواصل مع الدعم
          </Button>
        </div>
      </div>
    </div>
  )
}
