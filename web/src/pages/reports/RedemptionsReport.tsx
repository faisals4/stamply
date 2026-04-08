import { useEffect, useState } from 'react'
import { Link, useSearch } from 'wouter'
import { Gift, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { FilterPills } from '@/components/ui/filter-pills'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingBlock } from '@/components/ui/spinner'
import { fetchRedemptionsReport } from '@/lib/api/reports'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { useDebounce } from '@/lib/hooks/useDebounce'
import {
  formatDateTime,
  rangeToDates,
  parseRangeParam,
  DATE_RANGE_PRESETS,
  type DateRange,
} from '@/lib/utils/date'

/**
 * /admin/reports/redemptions — paginated reward-redemption log. Opens from
 * the "المكافآت المستبدلة" stat card on the dashboard.
 */
export default function RedemptionsReportPage() {
  const searchString = useSearch()
  const initialRange = parseRangeParam(
    new URLSearchParams(searchString).get('range'),
  )
  const initialDates = rangeToDates(initialRange)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState(initialDates.from)
  const [to, setTo] = useState(initialDates.to)
  const [dateRange, setDateRange] = useState<DateRange>(initialRange)

  useEffect(() => {
    const r = parseRangeParam(new URLSearchParams(searchString).get('range'))
    const dates = rangeToDates(r)
    setDateRange(r)
    setFrom(dates.from)
    setTo(dates.to)
    setPage(1)
  }, [searchString])

  const handleRangeChange = (r: DateRange) => {
    const dates = rangeToDates(r)
    setDateRange(r)
    setFrom(dates.from)
    setTo(dates.to)
    setPage(1)
  }

  const handleDateInputChange = (field: 'from' | 'to', value: string) => {
    if (field === 'from') setFrom(value)
    else setTo(value)
    setDateRange('custom')
    setPage(1)
  }

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = usePaginatedQuery(
    ['report-redemptions', debouncedSearch, from, to],
    (p) =>
      fetchRedemptionsReport({
        page: p,
        q: debouncedSearch || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    page,
  )

  const rows = data?.data ?? []
  const meta = data?.meta

  return (
    <div>
      <BackButton href="/admin" label="لوحة التحكم" />

      <PageHeader
        icon={<Gift />}
        title="سجل المكافآت المستبدلة"
        subtitle="كل عمليات صرف المكافآت في النظام"
      />

      {/* Quick date-range pills */}
      <FilterPills
        items={DATE_RANGE_PRESETS}
        selected={dateRange === 'custom' ? 'all' : dateRange}
        onSelect={handleRangeChange}
        className="mb-4"
      />

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">بحث (اسم أو رقم العميل)</Label>
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            placeholder="اكتب للبحث..."
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">من تاريخ</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => handleDateInputChange('from', e.target.value)}
            className="mt-1 h-9"
            dir="ltr"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => handleDateInputChange('to', e.target.value)}
            className="mt-1 h-9"
            dir="ltr"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={Search} message="لا توجد نتائج مطابقة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">العميل</th>
                  <th className="text-start px-4 py-3 font-medium">المكافأة</th>
                  <th className="text-start px-4 py-3 font-medium">البطاقة</th>
                  <th className="text-start px-4 py-3 font-medium">الرمز</th>
                  <th className="text-start px-4 py-3 font-medium">بواسطة</th>
                  <th className="text-start px-4 py-3 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/20 transition">
                    <td className="px-4 py-3">
                      {row.customer ? (
                        <Link
                          href={`/admin/customers/${row.customer.id}`}
                          className="font-medium hover:text-primary transition"
                        >
                          {row.customer.name}
                          <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                            {row.customer.phone}
                          </div>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{row.reward?.name ?? '—'}</div>
                      {row.reward && (
                        <div className="text-[11px] text-muted-foreground">
                          {row.reward.stamps_required} طوابع
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{row.card_template?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[11px] font-mono" dir="ltr">
                      {row.code}
                    </td>
                    <td className="px-4 py-3 text-xs">{row.used_by?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDateTime(row.used_at ?? row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 pb-4">
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
