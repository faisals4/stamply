import { useEffect, useState } from 'react'
import { Link, useSearch } from 'wouter'
import { Stamp, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { FilterPills } from '@/components/ui/filter-pills'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingBlock } from '@/components/ui/spinner'
import { fetchStampsReport } from '@/lib/api/reports'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { useDebounce } from '@/lib/hooks/useDebounce'
import {
  formatDateTime,
  rangeToDates,
  parseRangeParam,
  DATE_RANGE_PRESETS,
  type DateRange,
} from '@/lib/utils/date'

const REASONS: { value: string; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'manual', label: 'يدوي' },
  { value: 'welcome', label: 'ترحيبي' },
  { value: 'birthday', label: 'عيد ميلاد' },
  { value: 'automation', label: 'أتمتة' },
  { value: 'refund', label: 'استرجاع' },
]


/**
 * /admin/reports/stamps — full paginated stamp log for the tenant. Opens
 * from clicking the "إجمالي الأختام" card on the dashboard. Every filter
 * round-trips to the backend; filtering never happens client-side so this
 * page scales to millions of rows.
 */
export default function StampsReportPage() {
  // Read optional `?range=today|week|month` query param so the dashboard
  // cards can deep-link into a specific preset.
  const searchString = useSearch()
  const initialRange = parseRangeParam(
    new URLSearchParams(searchString).get('range'),
  )

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const initialDates = rangeToDates(initialRange)
  const [from, setFrom] = useState(initialDates.from)
  const [to, setTo] = useState(initialDates.to)
  const [dateRange, setDateRange] = useState<DateRange>(initialRange)

  // Keep state in sync if the URL changes (e.g. clicking another stat card).
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
    // Manual date edits switch to custom mode so the preset pill deselects.
    if (field === 'from') setFrom(value)
    else setTo(value)
    setDateRange('custom')
    setPage(1)
  }

  // Debounce the search input so we don't fire a request per keystroke.
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isFetching } = usePaginatedQuery(
    ['report-stamps', debouncedSearch, reason, from, to],
    (p) =>
      fetchStampsReport({
        page: p,
        q: debouncedSearch || undefined,
        reason: reason || undefined,
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
        icon={<Stamp />}
        title="سجل الأختام"
        subtitle="كل الأختام المعطاة للعملاء عبر كل البطاقات"
      />

      {/* Quick date-range pills */}
      <FilterPills
        items={DATE_RANGE_PRESETS}
        selected={dateRange === 'custom' ? 'all' : dateRange}
        onSelect={handleRangeChange}
        className="mb-4"
      />

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          <Label className="text-xs text-muted-foreground">السبب</Label>
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setPage(1)
            }}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
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
                  <th className="text-start px-4 py-3 font-medium">البطاقة</th>
                  <th className="text-start px-4 py-3 font-medium">العدد</th>
                  <th className="text-start px-4 py-3 font-medium">السبب</th>
                  <th className="text-start px-4 py-3 font-medium">بواسطة</th>
                  <th className="text-start px-4 py-3 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t hover:bg-muted/20 transition"
                  >
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
                    <td className="px-4 py-3 text-xs">{row.card_template?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.count > 0
                            ? 'font-semibold text-emerald-600'
                            : 'font-semibold text-red-600'
                        }
                      >
                        {row.count > 0 ? `+${row.count}` : row.count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {reasonLabel(row.reason)}
                    </td>
                    <td className="px-4 py-3 text-xs">{row.given_by?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDateTime(row.created_at)}
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

      {isFetching && !isLoading && (
        <div className="text-[11px] text-muted-foreground mt-2 text-center">
          يتم تحديث النتائج...
        </div>
      )}
    </div>
  )
}

function reasonLabel(v: string): string {
  const map: Record<string, string> = {
    manual: 'يدوي',
    welcome: 'ترحيبي',
    birthday: 'عيد ميلاد',
    automation: 'أتمتة',
    refund: 'استرجاع',
    spend: 'إنفاق',
    visit: 'زيارة',
    product: 'منتج',
  }
  return map[v] ?? v
}
