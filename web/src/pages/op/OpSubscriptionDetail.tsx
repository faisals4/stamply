import { useState } from 'react'
import { useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FullPageLoader } from '@/components/ui/spinner'
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { formatDate, formatDateTime } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import {
  getOpSubscription,
  getOpSubscriptionLogs,
  updateOpSubscription,
  extendOpSubscription,
  deleteOpSubscriptionLog,
  listOpPlans,
  type OpSubscriptionDetail as OpSubscriptionDetailType,
  type SubscriptionLogItem,
  type PlanItem,
} from '@/lib/api/op'

/**
 * /op/subscriptions/:id — detailed subscription management for a single merchant.
 * Shows subscription details, usage stats, logs, and provides extend/plan-change
 * functionality.
 */
export default function OpSubscriptionDetailPage() {
  const [, params] = useRoute('/op/subscriptions/:id')
  const id = params?.id
  const qc = useQueryClient()

  // State for forms
  const [showExtendForm, setShowExtendForm] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [extendMonths, setExtendMonths] = useState('1')
  const [extendAmount, setExtendAmount] = useState('')
  const [extendPaymentMethod, setExtendPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash')
  const [extendNotes, setExtendNotes] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [planInterval, setPlanInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [planPrice, setPlanPrice] = useState('')
  const [logsPage, setLogsPage] = useState(1)

  // Queries
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['op-subscriptions', 'detail', id],
    queryFn: () => getOpSubscription(id!),
    enabled: !!id,
  })

  const { data: logsData } = useQuery({
    queryKey: ['op-subscriptions', 'logs', id, logsPage],
    queryFn: () => getOpSubscriptionLogs(id!, { page: logsPage }),
    enabled: !!id,
  })

  const { data: plans } = useQuery({
    queryKey: ['op-plans'],
    queryFn: listOpPlans,
  })

  const logs = logsData?.data ?? []
  const logsMeta = logsData?.meta

  // Mutations
  const extendMutation = useMutation({
    mutationFn: () =>
      extendOpSubscription(id!, {
        months: extendMonths ? parseInt(extendMonths) : undefined,
        amount: extendAmount ? parseFloat(extendAmount) : undefined,
        payment_method: extendPaymentMethod,
        notes: extendNotes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-subscriptions', 'detail', id] })
      qc.invalidateQueries({ queryKey: ['op-subscriptions', 'logs', id] })
      setShowExtendForm(false)
      setExtendMonths('1')
      setExtendAmount('')
      setExtendNotes('')
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      alert(axiosErr.response?.data?.message ?? 'تعذر تمديد الاشتراك')
    },
  })

  const deleteLogMutation = useMutation({
    mutationFn: (logId: number) => deleteOpSubscriptionLog(id!, logId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-subscriptions', 'detail', id] })
      qc.invalidateQueries({ queryKey: ['op-subscriptions', 'logs', id] })
    },
  })

  const changePlanMutation = useMutation({
    mutationFn: () => {
      const selectedPlan = plans?.find((p) => p.id === selectedPlanId)
      return updateOpSubscription(id!, {
        plan: selectedPlan?.slug,
        plan_interval: planInterval,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-subscriptions', 'detail', id] })
      qc.invalidateQueries({ queryKey: ['op-subscriptions', 'logs', id] })
      setShowPlanForm(false)
      setSelectedPlanId(null)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      alert(axiosErr.response?.data?.message ?? 'تعذر تغيير الخطة')
    },
  })

  if (isLoading || !subscription) {
    return <FullPageLoader />
  }

  const statusBadges = {
    trial: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'تجريبي', icon: Clock },
    active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'نشط', icon: CheckCircle2 },
    expiring_soon: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'ينتهي قريباً', icon: AlertCircle },
    expired: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'منتهي', icon: XCircle },
    disabled: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'معطّل', icon: XCircle },
  }

  const statusBadge = statusBadges[subscription.subscription_status]
  const StatusIcon = statusBadge.icon

  const handlePlanChange = (plan: PlanItem) => {
    setSelectedPlanId(plan.id)
    setPlanPrice(planInterval === 'monthly' ? plan.monthly_price : plan.yearly_price)
  }

  return (
    <div className="max-w-6xl">
      <BackButton href="/op/subscriptions" label="الاشتراكات" />

      <PageHeader
        icon={<CreditCard />}
        title={subscription.name}
        subtitle={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
              {subscription.plan_name_ar}
            </span>
            <span className={cn(
              'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full',
              statusBadge.bg,
              statusBadge.text,
            )}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusBadge.label}
            </span>
            <span className="font-mono text-xs text-muted-foreground" dir="ltr">
              {subscription.subdomain}
            </span>
          </span>
        }
      />

      {/* Subscription dates */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <InfoCard
          label="بدء الاشتراك"
          value={subscription.subscription_starts_at ?? subscription.created_at ? formatDate(subscription.subscription_starts_at ?? subscription.created_at!) : '—'}
        />
        <InfoCard
          label="انتهاء الاشتراك"
          value={(subscription.subscription_ends_at || subscription.trial_ends_at) ? formatDate(subscription.subscription_ends_at ?? subscription.trial_ends_at!) : '—'}
        />
        <InfoCard
          label="الأيام المتبقية"
          value={subscription.days_remaining.toString()}
        />
        <InfoCard
          label="السعر"
          value={subscription.plan_price}
        />
      </section>

      {/* Plan details and usage */}
      <section className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Plan details */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm text-foreground mb-4">تفاصيل الخطة</h2>
          {subscription.plan_details ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">السعر الشهري</span>
                <span className="font-mono font-medium">{subscription.plan_details.monthly_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">السعر السنوي</span>
                <span className="font-mono font-medium">{subscription.plan_details.yearly_price}</span>
              </div>
              <hr className="border-border my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">حد أقصى للبطاقات</span>
                <span className="font-medium">{subscription.plan_details.max_cards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">حد أقصى للمواقع</span>
                <span className="font-medium">{subscription.plan_details.max_locations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">حد أقصى للمستخدمين</span>
                <span className="font-medium">{subscription.plan_details.max_users}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد تفاصيل متاحة</p>
          )}
        </div>

        {/* Usage stats */}
        <div className="space-y-3">
          <UsageCard
            label="البطاقات"
            used={subscription.usage.cards}
            max={subscription.plan_details?.max_cards || 0}
          />
          <UsageCard
            label="المواقع"
            used={subscription.usage.locations}
            max={subscription.plan_details?.max_locations || 0}
          />
          <UsageCard
            label="المستخدمون"
            used={subscription.usage.users}
            max={subscription.plan_details?.max_users || 0}
          />
        </div>
      </section>

      {/* Actions */}
      <section className="flex flex-col sm:flex-row gap-3 mb-6">
        <Button
          onClick={() => setShowExtendForm(!showExtendForm)}
          className="sm:flex-1"
        >
          {showExtendForm ? 'إلغاء' : 'تمديد الاشتراك'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowPlanForm(!showPlanForm)}
          className="sm:flex-1 border-border bg-card hover:bg-muted"
        >
          {showPlanForm ? 'إلغاء' : 'تغيير الخطة'}
        </Button>
      </section>

      {/* Extend form */}
      {showExtendForm && (
        <section className="rounded-xl border border-border bg-card p-5 mb-6">
          <h2 className="font-semibold text-sm text-foreground mb-4">تمديد الاشتراك</h2>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2">عدد الأشهر</label>
                <Input
                  type="number"
                  min="1"
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(e.target.value)}
                  placeholder="1"
                  className="bg-card border-border"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-2">المبلغ (اختياري)</label>
                <Input
                  type="number"
                  value={extendAmount}
                  onChange={(e) => setExtendAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-card border-border"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">طريقة الدفع</label>
              <div className="grid sm:grid-cols-3 gap-2">
                {(['cash', 'bank_transfer', 'card'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setExtendPaymentMethod(method)}
                    className={cn(
                      'px-3 py-2 rounded-md border text-xs transition',
                      extendPaymentMethod === method
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-card border-border hover:border-ring',
                    )}
                  >
                    {method === 'cash' ? 'نقد' : method === 'bank_transfer' ? 'تحويل بنكي' : 'بطاقة'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">ملاحظات (اختياري)</label>
              <Input
                value={extendNotes}
                onChange={(e) => setExtendNotes(e.target.value)}
                placeholder="أضف ملاحظة..."
                className="bg-card border-border"
              />
            </div>
            <Button
              onClick={() => extendMutation.mutate()}
              disabled={extendMutation.isPending}
              className="w-full"
            >
              {extendMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
              )}
              تمديد الاشتراك
            </Button>
          </div>
        </section>
      )}

      {/* Change plan form */}
      {showPlanForm && (
        <section className="rounded-xl border border-border bg-card p-5 mb-6">
          <h2 className="font-semibold text-sm text-foreground mb-4">تغيير الخطة</h2>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground block">اختر الخطة</label>
              <div className="grid gap-2">
                {plans?.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handlePlanChange(plan)}
                    className={cn(
                      'p-3 rounded-lg border text-start text-sm transition',
                      selectedPlanId === plan.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card border-border hover:border-ring',
                    )}
                  >
                    <div className="font-medium">{plan.name_ar}</div>
                    <div className="text-xs text-muted-foreground">
                      شهري: {plan.monthly_price} | سنوي: {plan.yearly_price}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {selectedPlanId && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground block mb-2">الفترة</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['monthly', 'yearly'] as const).map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => {
                          setPlanInterval(interval)
                          const plan = plans?.find((p) => p.id === selectedPlanId)
                          if (plan) {
                            setPlanPrice(interval === 'monthly' ? plan.monthly_price : plan.yearly_price)
                          }
                        }}
                        className={cn(
                          'px-3 py-2 rounded-md border text-xs transition',
                          planInterval === interval
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-card border-border hover:border-ring',
                        )}
                      >
                        {interval === 'monthly' ? 'شهري' : 'سنوي'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-2">السعر</label>
                  <Input
                    type="text"
                    value={planPrice}
                    readOnly
                    className="bg-muted border-border"
                  />
                </div>
              </>
            )}
            <Button
              onClick={() => changePlanMutation.mutate()}
              disabled={!selectedPlanId || changePlanMutation.isPending}
              className="w-full"
            >
              {changePlanMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
              )}
              تطبيق التغيير
            </Button>
          </div>
        </section>
      )}

      {/* Logs */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">سجل التغييرات</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            آخر التغييرات على هذا الاشتراك
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">لا توجد سجلات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">الإجراء</th>
                  <th className="text-start px-4 py-3 font-medium">من → إلى</th>
                  <th className="text-start px-4 py-3 font-medium">المبلغ</th>
                  <th className="text-start px-4 py-3 font-medium">طريقة الدفع</th>
                  <th className="text-start px-4 py-3 font-medium">المنفذ</th>
                  <th className="text-start px-4 py-3 font-medium">التاريخ</th>
                  <th className="text-start px-4 py-3 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.plan_from && log.plan_to ? (
                        <>
                          {log.plan_from}
                          <span className="mx-1">→</span>
                          {log.plan_to}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{log.amount}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                        {log.payment_method === 'cash'
                          ? 'نقد'
                          : log.payment_method === 'bank_transfer'
                            ? 'تحويل بنكي'
                            : log.payment_method === 'card'
                              ? 'بطاقة'
                              : log.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.performer?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (confirm('هل تريد إلغاء هذا الإجراء؟ سيتم عكس التمديد إن وُجد.')) {
                            deleteLogMutation.mutate(log.id)
                          }
                        }}
                        disabled={deleteLogMutation.isPending}
                        className="text-[10px] text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        إلغاء
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Pagination meta={logsMeta} onPageChange={setLogsPage} />
        </div>
      </section>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] text-muted-foreground mb-1.5">{label}</div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  )
}

function UsageCard({
  label,
  used,
  max,
}: {
  label: string
  used: number
  max: number
}) {
  const percentage = max > 0 ? (used / max) * 100 : 0
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">
          {used} / {max}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            percentage < 70
              ? 'bg-emerald-500'
              : percentage < 90
                ? 'bg-yellow-500'
                : 'bg-red-500',
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
