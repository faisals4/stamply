import { useState } from 'react'
import { FullPageLoader } from '@/components/ui/spinner'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  CreditCard,
  Stamp,
  Gift,
  Download,
  TrendingUp,
  FileSpreadsheet,
  Loader2,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/lib/auth/auth'
import { getReportsSummary, downloadCsv, type ReportSummary } from '@/lib/api/reports'

/**
 * /admin/reports — analytics overview + CSV downloads.
 * Top: 4 stat cards. Middle: 14-day trend chart (inline SVG sparkline).
 * Bottom: top cards + export buttons.
 */
export default function ReportsPage() {
  const { can } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: getReportsSummary,
  })

  return (
    <div>
      <PageHeader
        icon={<BarChart3 />}
        title="التقارير"
        subtitle="نظرة عامة على نشاط برنامج الولاء + تصدير البيانات إلى CSV"
      />

      {isLoading || !data ? (
        <FullPageLoader />
      ) : (
        <>
          {/* Top stat cards — each opens the relevant drill-down report */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Users className="w-5 h-5 text-violet-500" />}
              label="إجمالي العملاء"
              value={data.totals.customers}
              sublabel={`+${data.totals.customers_week} هذا الأسبوع`}
              href="/admin/customers"
            />
            <StatCard
              icon={<CreditCard className="w-5 h-5 text-purple-500" />}
              label="البطاقات المُصدَرة"
              value={data.totals.issued_cards}
              sublabel={`من أصل ${data.totals.cards} قالب`}
              href="/admin/reports/issued-cards"
            />
            <StatCard
              icon={<Stamp className="w-5 h-5 text-amber-500" />}
              label="إجمالي الأختام"
              value={data.totals.stamps}
              sublabel={`${data.totals.stamps_today} اليوم • ${data.totals.stamps_week} الأسبوع`}
              href="/admin/reports/stamps"
            />
            <StatCard
              icon={<Gift className="w-5 h-5 text-emerald-500" />}
              label="المكافآت المستبدلة"
              value={data.totals.redemptions}
              href="/admin/reports/redemptions"
            />
          </section>

          {/* Trend charts */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <TrendCard
              title="الأختام اليومية"
              subtitle="آخر 14 يوم"
              points={data.stamps_trend}
              color="amber"
            />
            <TrendCard
              title="العملاء الجدد"
              subtitle="آخر 14 يوم"
              points={data.customers_trend}
              color="blue"
            />
          </section>

          {/* Top cards */}
          <section className="rounded-xl border border-border bg-card p-5 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              أفضل البطاقات أداءً
            </h3>
            {data.top_cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بطاقات بعد</p>
            ) : (
              <ul className="space-y-2">
                {data.top_cards.map((c, i) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-mono text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.status === 'published' ? 'منشورة' : 'مسودة'}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      {c.issued_count}{' '}
                      <span className="text-[10px] text-muted-foreground">بطاقة</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Exports */}
          {can('reports.export') && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1 flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                تصدير البيانات
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                نزّل ملفات CSV قابلة للفتح في Excel و Google Sheets
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ExportButton kind="customers" label="العملاء" />
                <ExportButton kind="stamps" label="الأختام" />
                <ExportButton kind="redemptions" label="المكافآت" />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Tiny inline SVG sparkline. Avoids pulling in a chart library — Stamply
 * stays dep-light for the dashboard widgets.
 */
function TrendCard({
  title,
  subtitle,
  points,
  color,
}: {
  title: string
  subtitle: string
  points: ReportSummary['stamps_trend']
  color: 'amber' | 'blue'
}) {
  const max = Math.max(1, ...points.map((p) => p.count))
  const total = points.reduce((sum, p) => sum + p.count, 0)
  const w = 280
  const h = 60
  const stepX = points.length > 1 ? w / (points.length - 1) : 0
  const path = points
    .map((p, i) => {
      const x = i * stepX
      const y = h - (p.count / max) * h
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  const fillPath = `${path} L ${w} ${h} L 0 ${h} Z`
  const stroke = color === 'amber' ? '#f59e0b' : '#3b82f6'
  const fill = color === 'amber' ? '#fef3c7' : '#dbeafe'

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-2xl font-bold">{total}</div>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-16 mt-2"
        preserveAspectRatio="none"
      >
        <path d={fillPath} fill={fill} fillOpacity={0.5} />
        <path d={path} stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function ExportButton({ kind, label }: { kind: 'customers' | 'stamps' | 'redemptions'; label: string }) {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    setBusy(true)
    try {
      await downloadCsv(kind)
    } catch {
      alert('تعذر التصدير')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={busy} className="justify-between">
      <span>{label}</span>
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  )
}
