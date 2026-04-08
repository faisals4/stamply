import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  CreditCard,
  Users,
  Stamp,
  TrendingUp,
  Gift,
  LayoutDashboard,
} from 'lucide-react'
import { useOpAuth } from '@/lib/opAuth'
import { getOpDashboardStats } from '@/lib/opApi'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'

/**
 * /op — SaaS operator dashboard. Platform-wide numbers across all tenants.
 */
export default function OpDashboardPage() {
  const { admin } = useOpAuth()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['op-dashboard-stats'],
    queryFn: getOpDashboardStats,
    refetchInterval: 30_000,
  })

  return (
    <div>
      <PageHeader
        className="mb-8"
        icon={<LayoutDashboard />}
        title={`أهلاً، ${admin?.name}`}
        subtitle="لوحة تشغيل المنصة"
      />

      {/* Top stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="إجمالي التجار"
          value={stats?.tenants_total}
          loading={isLoading}
          icon={<Building2 className="w-5 h-5 text-blue-500" />}
          sublabel={
            stats
              ? `${stats.tenants_active} نشط • +${stats.tenants_new_month} هذا الشهر`
              : undefined
          }
        />
        <StatCard
          label="قوالب البطاقات"
          value={stats?.card_templates_total}
          loading={isLoading}
          icon={<CreditCard className="w-5 h-5 text-purple-500" />}
          sublabel={`${stats?.active_card_templates ?? 0} منشورة`}
        />
        <StatCard
          label="البطاقات المُصدَرة"
          value={stats?.issued_cards_total}
          loading={isLoading}
          icon={<Users className="w-5 h-5 text-emerald-500" />}
          sublabel={`${stats?.customers_total ?? 0} عميل نهائي`}
        />
        <StatCard
          label="أختام اليوم"
          value={stats?.stamps_today}
          loading={isLoading}
          icon={<Stamp className="w-5 h-5 text-amber-500" />}
          sublabel={`${stats?.stamps_total ?? 0} إجمالي`}
        />
      </section>

      {/* Secondary */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <InsightCard
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          title="النشاط الأسبوعي"
          lines={[
            { label: 'تجار نشطون هذا الأسبوع', value: stats?.active_tenants_week ?? 0 },
            { label: 'إجمالي حسابات الموظفين', value: stats?.users_total ?? 0 },
          ]}
        />
        <InsightCard
          icon={<Gift className="w-5 h-5 text-emerald-500" />}
          title="المكافآت"
          lines={[
            { label: 'إجمالي المكافآت المستبدلة', value: stats?.redemptions_total ?? 0 },
          ]}
        />
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-1">حالة المنصة</h2>
        <p className="text-xs text-muted-foreground mb-4">
          الأرقام الحية لكل المستأجرين في النظام
        </p>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>✅ Tenant signup (self-serve) مفعّل</li>
          <li>✅ Tenant auth (Sanctum — ability: tenant)</li>
          <li>✅ Platform auth (Sanctum — ability: op)</li>
          <li>✅ Cross-guard security: tenant tokens denied on /op/* (403)</li>
          <li>⏳ Stripe billing (Phase 6)</li>
          <li>⏳ Email notifications للمنصة</li>
        </ul>
      </section>
    </div>
  )
}

function InsightCard({
  icon,
  title,
  lines,
}: {
  icon: React.ReactNode
  title: string
  lines: { label: string; value: number }[]
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <dl className="space-y-2">
        {lines.map((l) => (
          <div key={l.label} className="flex items-center justify-between">
            <dt className="text-sm text-muted-foreground">{l.label}</dt>
            <dd className="font-semibold">{l.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
