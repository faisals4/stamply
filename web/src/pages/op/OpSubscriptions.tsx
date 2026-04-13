import { useState } from 'react'
import { useLocation } from 'wouter'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Pagination } from '@/components/ui/pagination'
import { formatDate } from '@/lib/utils/date'
import {
  Search,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import {
  listOpSubscriptions,
  type OpSubscriptionListItem,
} from '@/lib/api/op'
import { cn } from '@/lib/utils'

/**
 * /op/subscriptions — subscriptions list page showing all merchants
 * with their subscription statuses, plans, and end dates.
 */
export default function OpSubscriptionsPage() {
  const [, setLocation] = useLocation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'trial'>('all')
  const [planFilter, setplanFilter] = useState<'all' | 'basic' | 'growth' | 'business'>('all')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = usePaginatedQuery(
    ['op-subscriptions', debouncedSearch, statusFilter, planFilter],
    (p) =>
      listOpSubscriptions({
        page: p,
        q: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        plan: planFilter === 'all' ? undefined : planFilter,
      }),
    page,
  )

  const subscriptions = data?.data ?? []
  const meta = data?.meta

  const statusBadges = {
    trial: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'تجريبي' },
    active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'نشط' },
    expiring_soon: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'ينتهي قريباً' },
    expired: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'منتهي' },
    disabled: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'معطّل' },
  }

  const getStatusBadge = (status: OpSubscriptionListItem['subscription_status']) => {
    return statusBadges[status] || statusBadges.active
  }

  return (
    <div>
      <PageHeader
        icon={<CreditCard />}
        title="إدارة الاشتراكات"
        subtitle="كل التجار مع حالة اشتراكاتهم"
      />

      {/* Search + filters */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="ابحث بالاسم أو المُعرِّف..."
            className="ps-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'expired', 'trial'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s)
                setPage(1)
              }}
              className={cn(
                'text-xs px-3 py-2 rounded-md border transition whitespace-nowrap',
                statusFilter === s
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-card border-border text-muted-foreground hover:border-ring',
              )}
            >
              {s === 'all' ? 'الكل' : s === 'active' ? 'نشط' : s === 'expired' ? 'منتهي' : 'تجريبي'}
            </button>
          ))}
        </div>

        {/* Plan filter buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">الخطة:</span>
          {(['all', 'basic', 'growth', 'business'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setplanFilter(p)
                setPage(1)
              }}
              className={cn(
                'text-xs px-3 py-2 rounded-md border transition',
                planFilter === p
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-card border-border text-muted-foreground hover:border-ring',
              )}
            >
              {p === 'all' ? 'الكل' : p === 'basic' ? 'أساسي' : p === 'growth' ? 'نمو' : 'أعمال'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد نتائج</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">التاجر</th>
                  <th className="text-start px-4 py-3 font-medium">الخطة</th>
                  <th className="text-start px-4 py-3 font-medium">الحالة</th>
                  <th className="text-start px-4 py-3 font-medium">تاريخ الانتهاء</th>
                  <th className="text-start px-4 py-3 font-medium">السعر</th>
                  <th className="text-start px-4 py-3 font-medium">الأيام المتبقية</th>
                  <th className="text-start px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const badge = getStatusBadge(sub.subscription_status)
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => setLocation(`/op/subscriptions/${sub.id}`)}
                      className="border-t hover:bg-muted transition cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            <CreditCard className="w-4 h-4 text-neutral-400" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{sub.name}</div>
                            <div className="text-xs text-muted-foreground font-mono" dir="ltr">
                              {sub.subdomain}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                          {sub.plan_name_ar}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full',
                          badge.bg,
                          badge.text,
                        )}>
                          {sub.subscription_status === 'trial' && <Clock className="w-2.5 h-2.5" />}
                          {sub.subscription_status === 'active' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {sub.subscription_status === 'expiring_soon' && <AlertCircle className="w-2.5 h-2.5" />}
                          {sub.subscription_status === 'expired' && <XCircle className="w-2.5 h-2.5" />}
                          {sub.subscription_status === 'disabled' && <XCircle className="w-2.5 h-2.5" />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(sub.subscription_ends_at || sub.trial_ends_at) ? formatDate(sub.subscription_ends_at ?? sub.trial_ends_at!) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">
                        {sub.plan_price}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded',
                          sub.days_remaining > 30
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : sub.days_remaining > 0
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400',
                        )}>
                          {sub.days_remaining}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setLocation(`/op/subscriptions/${sub.id}`)
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          →
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        {subscriptions.length} اشتراك
        {statusFilter !== 'all' && ` (${getStatusBadge(statusFilter as OpSubscriptionListItem['subscription_status']).label})`}
      </p>
    </div>
  )
}
