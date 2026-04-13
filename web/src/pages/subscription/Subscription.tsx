import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Crown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Users,
  MapPin,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/date'
import { useAuth } from '@/lib/auth/auth'
import { getSubscription, type SubscriptionInfo } from '@/lib/api/subscription'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

const actionLabels: Record<string, string> = {
  trial_started: 'بدء التجربة',
  created: 'إنشاء',
  renewed: 'تجديد',
  upgraded: 'ترقية',
  downgraded: 'تخفيض',
  cancelled: 'إلغاء',
  extended: 'تمديد',
  updated: 'تحديث',
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'trial':
      return 'bg-yellow-50 text-yellow-900 border-yellow-200'
    case 'active':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200'
    case 'expiring_soon':
      return 'bg-orange-50 text-orange-900 border-orange-200'
    case 'expired':
      return 'bg-red-50 text-red-900 border-red-200'
    case 'disabled':
      return 'bg-gray-50 text-gray-900 border-gray-200'
    default:
      return 'bg-gray-50 text-gray-900 border-gray-200'
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'trial':
      return 'secondary'
    case 'active':
      return 'default'
    case 'expiring_soon':
      return 'secondary'
    case 'expired':
    case 'disabled':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getStatusLabel(status: string, isTrial: boolean): string {
  if (isTrial) return 'تجريبي'
  switch (status) {
    case 'trial':
      return 'تجريبي'
    case 'active':
      return 'نشط'
    case 'expiring_soon':
      return 'ينتهي قريباً'
    case 'expired':
      return 'منتهي'
    case 'disabled':
      return 'معطل'
    default:
      return '—'
  }
}

function UsageProgressBar({
  current,
  max,
  label,
}: {
  current: number
  max: number
  label: string
}) {
  const percentage = max > 0 ? (current / max) * 100 : 0
  let bgColor = 'bg-emerald-500'
  if (percentage >= 100) {
    bgColor = 'bg-red-500'
  } else if (percentage >= 80) {
    bgColor = 'bg-orange-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">
          {current} من {max}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full transition-all', bgColor)} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  const { user } = useAuth()
  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscription,
  })

  const displayData = useMemo(() => {
    if (!subscription) return null

    const statusLabel = getStatusLabel(subscription.subscription_status, subscription.is_trial)
    let endDate: string | null = null
    let startDate: string | null = null

    if (subscription.is_trial && subscription.trial_ends_at) {
      endDate = subscription.trial_ends_at
      startDate = null
    } else if (subscription.subscription_starts_at) {
      startDate = subscription.subscription_starts_at
      endDate = subscription.subscription_ends_at
    }

    return {
      statusLabel,
      endDate,
      startDate,
      daysRemaining: subscription.days_remaining,
      planNameAr: subscription.plan_name_ar,
    }
  }, [subscription])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (error || !subscription) {
    return (
      <div>
        <PageHeader icon={<Crown />} title="الاشتراك" />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-900">خطأ في تحميل الاشتراك</h2>
          <p className="text-red-700 mt-2">يرجى محاولة تحديث الصفحة</p>
        </div>
      </div>
    )
  }

  const isExpired = subscription.subscription_status === 'expired'
  const isTrial = subscription.is_trial
  const isActive = subscription.subscription_status === 'active'
  const isExpiringSoon = subscription.subscription_status === 'expiring_soon'

  return (
    <div>
      <PageHeader icon={<Crown />} title="الاشتراك" />

      {/* Status Banner — if expired */}
      {isExpired && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">اشتراكك منتهي</p>
            <p className="text-sm text-red-700 mt-1">
              انتهى اشتراكك في {formatDate(displayData?.endDate)}
            </p>
          </div>
        </div>
      )}

      {/* Main Status Section */}
      <div className={cn('rounded-xl border p-6 mb-6', getStatusColor(subscription.subscription_status))}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <Badge variant={getStatusBadgeVariant(subscription.subscription_status)}>
              {displayData?.statusLabel}
            </Badge>
            <h2 className="text-2xl font-bold mt-3">{displayData?.planNameAr}</h2>
          </div>
          {isActive && <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />}
          {isExpiringSoon && <Clock className="w-8 h-8 text-orange-600 shrink-0" />}
          {isExpired && <AlertCircle className="w-8 h-8 text-red-600 shrink-0" />}
        </div>

        {/* Dates Section */}
        {isTrial && subscription.trial_ends_at ? (
          <div className="space-y-2 text-sm mb-4">
            <p className="text-inherit opacity-90">بدأت تجربتك في {formatDate(subscription.created_at)}</p>
            <p className="text-inherit opacity-90">تنتهي التجربة في {formatDate(subscription.trial_ends_at)}</p>
          </div>
        ) : displayData?.startDate ? (
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="opacity-75">تاريخ البدء</span>
              <p className="font-semibold">{formatDate(displayData.startDate)}</p>
            </div>
            <div>
              <span className="opacity-75">تاريخ الانتهاء</span>
              <p className="font-semibold">{formatDate(displayData.endDate)}</p>
            </div>
          </div>
        ) : null}

        {/* Days Remaining / Countdown */}
        {displayData && displayData.daysRemaining > 0 && !isExpired && (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{displayData.daysRemaining}</span>
              <span className="text-sm opacity-90">
                {isTrial ? 'يوم متبقي من 14 يوم' : 'يوم متبقي'}
              </span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all', isTrial ? 'bg-white/70' : 'bg-white/70')}
                style={{ width: `${(displayData.daysRemaining / (isTrial ? 14 : 365)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Plan Details Card */}
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h3 className="font-semibold text-lg mb-5">تفاصيل الخطة</h3>

        {/* Pricing */}
        {subscription.plan_details && (
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b">
            <div>
              <p className="text-sm text-muted-foreground">السعر الشهري</p>
              <p className="text-xl font-bold">{subscription.plan_details.monthly_price}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">السعر السنوي</p>
              <p className="text-xl font-bold">{subscription.plan_details.yearly_price}</p>
            </div>
          </div>
        )}

        {/* Usage Limits with Progress Bars */}
        <div className="space-y-4">
          <UsageProgressBar
            label="البطاقات"
            current={subscription.usage.cards}
            max={subscription.usage.cards_max}
          />
          <UsageProgressBar
            label="الفروع"
            current={subscription.usage.locations}
            max={subscription.usage.locations_max}
          />
          <UsageProgressBar
            label="المستخدمين"
            current={subscription.usage.users}
            max={subscription.usage.users_max}
          />
        </div>
      </div>

      {/* Recent Operations Section */}
      {subscription.recent_logs && subscription.recent_logs.length > 0 && (
        <div className="rounded-xl border bg-card p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">السجل الأخير</h3>
          <div className="space-y-3">
            {subscription.recent_logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between py-3 border-b last:border-b-0 text-sm"
              >
                <div className="space-y-1">
                  <p className="font-medium">{actionLabels[log.action] || log.action}</p>
                  <p className="text-muted-foreground text-xs">{formatDate(log.created_at)}</p>
                </div>
                <div className="text-right">
                  {log.plan_from && log.plan_to && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <span>{log.plan_to}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>{log.plan_from}</span>
                    </div>
                  )}
                  {log.amount && <p className="font-semibold text-primary">{log.amount}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">
              {isTrial
                ? 'ترقية الاشتراك'
                : isActive
                  ? 'تجديد الاشتراك'
                  : 'تجديد الاشتراك — تواصل معنا'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isTrial
                ? 'احصل على صلاحيات إضافية وميزات متقدمة'
                : 'استمر في استخدام جميع الميزات'}
            </p>
          </div>
          <Button
            variant="default"
            size="lg"
            onClick={() => {
              const text = isTrial
                ? 'أود ترقية اشتراكي التجريبي'
                : isActive
                  ? 'أود تجديد اشتراكي'
                  : 'أود تجديد اشتراكي المنتهي'
              window.open(
                `https://wa.me/966XXXXXXXXX?text=${encodeURIComponent(text)}`,
                '_blank',
              )
            }}
            className="shrink-0"
          >
            تواصل عبر واتساب
          </Button>
        </div>
      </div>
    </div>
  )
}
