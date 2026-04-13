import { useQuery } from '@tanstack/react-query'
import { Link } from 'wouter'
import {
  CreditCard,
  Users,
  Stamp,
  Gift,
  Cake,
  Activity,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth/auth'
import { getDashboardStats } from '@/lib/api/dashboard'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { ReachStatCards } from '@/components/messaging/ReachStatCards'
import { TrialExpiredBanner, SubscriptionExpiringBanner } from '@/components/banners/TrialExpiredBanner'

export default function DashboardPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const expiredData = (user as Record<string, unknown>)?.subscription_expired_data as
    | import('@/lib/auth/auth').SubscriptionExpiredData
    | undefined
  const subscription = (user as Record<string, unknown>)?.subscription as
    | { days_remaining?: number }
    | undefined
  const daysRemaining = subscription?.days_remaining

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  })

  return (
    <div>
      <PageHeader
        className="mb-5 sm:mb-8"
        icon={<LayoutDashboard />}
        title={`${t('welcomeBack')}، ${user?.name ?? '...'}`}
        subtitle={t('dashboard')}
      />

      {expiredData
        ? <TrialExpiredBanner data={expiredData} />
        : daysRemaining != null && daysRemaining <= 15
          ? <SubscriptionExpiringBanner daysRemaining={daysRemaining} />
          : null}

      {/* Top stats row — every card links to a drill-down report */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="إجمالي العملاء"
          value={stats?.customers}
          loading={isLoading}
          showTrendingIcon
          icon={<Users className="w-5 h-5 text-violet-500" />}
          sublabel={
            stats && stats.new_customers_today > 0
              ? `+${stats.new_customers_today} اليوم`
              : undefined
          }
          href="/admin/customers"
        />
        <StatCard
          label="البطاقات المُصدَرة"
          value={stats?.issued_cards}
          loading={isLoading}
          showTrendingIcon
          icon={<CreditCard className="w-5 h-5 text-purple-500" />}
          sublabel={`${stats?.active_cards ?? 0} قالب نشط`}
          href="/admin/reports/issued-cards"
        />
        <StatCard
          label="أختام اليوم"
          value={stats?.stamps_today}
          loading={isLoading}
          showTrendingIcon
          icon={<Stamp className="w-5 h-5 text-amber-500" />}
          sublabel={`${stats?.stamps_week ?? 0} هذا الأسبوع`}
          href="/admin/reports/stamps?range=today"
        />
        <StatCard
          label="مكافآت مستبدلة"
          value={stats?.total_rewards_redeemed}
          loading={isLoading}
          showTrendingIcon
          icon={<Gift className="w-5 h-5 text-emerald-500" />}
          sublabel={
            stats && stats.redemptions_today > 0
              ? `${stats.redemptions_today} اليوم`
              : undefined
          }
          href="/admin/reports/redemptions"
        />
      </section>

      {/* Marketing reach — how many customers can be messaged on
          each channel. Clicking a tile shows the underlying list. */}
      <section className="mb-6">
        <ReachStatCards />
      </section>

      {/* Secondary insights — numbers are clickable links to filtered lists */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 sm:mb-8">
        <InsightCard
          icon={<Activity className="w-5 h-5 text-violet-500" />}
          title="النشاط الأسبوعي"
          lines={[
            {
              label: 'عملاء نشطون هذا الأسبوع',
              value: stats?.active_customers_week ?? 0,
              href: '/admin/customers?filter=active_week',
            },
            {
              label: 'عملاء جدد هذا الشهر',
              value: stats?.new_customers_month ?? 0,
              href: '/admin/customers?filter=new_month',
            },
          ]}
        />
        <InsightCard
          icon={<Cake className="w-5 h-5 text-pink-500" />}
          title="أعياد الميلاد القادمة"
          lines={[
            {
              label: 'خلال 7 أيام',
              value: stats?.upcoming_birthdays_week ?? 0,
              href: '/admin/customers?filter=birthday_week',
            },
          ]}
          footer={
            stats && stats.upcoming_birthdays_week > 0
              ? '🎂 يتم إرسال الأختام الترحيبية تلقائياً'
              : undefined
          }
        />
      </section>

      {/* Phase status */}
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Stamply — حالة المنتج</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Phase 1 جاهز — Phase 2 (Wallet) ينتظر تثبيت الشهادات
            </p>
          </div>
        </div>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>
            ✅ إنشاء بطاقات ولاء (ختم) + محرر كامل مع معاينة مباشرة
          </li>
          <li>
            ✅ تسجيل العملاء عبر رابط عام + معاينة PWA مع QR حقيقي
          </li>
          <li>
            ✅ ماسح الكاشير (إضافة طوابع + صرف مكافآت)
          </li>
          <li>
            ✅ صفحة تفصيل العميل مع سجل النشاط + تعديل البيانات
          </li>
          <li>
            ✅ مواقع مع نطاق جغرافي + مهمة يومية لأختام أعياد الميلاد
          </li>
          <li>
            ⏳ Apple Wallet + Google Wallet — جاهز كهيكل، ينتظر الشهادات
          </li>
          <li>
            ⏳ Automation Builder + Push Notifications (Phase 5)
          </li>
        </ul>
      </section>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */

function InsightCard({
  icon,
  title,
  lines,
  footer,
}: {
  icon: React.ReactNode
  title: string
  lines: { label: string; value: number; href?: string }[]
  footer?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <dl className="space-y-2">
        {lines.map((l) =>
          l.href ? (
            <Link
              key={l.label}
              href={l.href}
              className="flex items-center justify-between rounded-md -mx-2 px-2 py-1 hover:bg-muted transition group cursor-pointer"
            >
              <dt className="text-sm text-muted-foreground group-hover:text-foreground transition">
                {l.label}
              </dt>
              <dd className="font-semibold text-primary group-hover:underline">{l.value}</dd>
            </Link>
          ) : (
            <div key={l.label} className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">{l.label}</dt>
              <dd className="font-semibold">{l.value}</dd>
            </div>
          ),
        )}
      </dl>
      {footer && (
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">{footer}</div>
      )}
    </div>
  )
}
