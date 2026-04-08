import { useState } from 'react'
import { Link } from 'wouter'
import { CreditCard, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingBlock } from '@/components/ui/spinner'
import { fetchIssuedCardsReport } from '@/lib/reportsApi'
import { usePaginatedQuery } from '@/lib/paginatedQuery'
import { useDebounce } from '@/lib/useDebounce'
import { formatDate } from '@/lib/formatDate'

/**
 * /admin/reports/issued-cards — paginated list of every card issued across
 * the tenant. Opens from the "البطاقات المُصدَرة" stat card on the dashboard.
 */
export default function IssuedCardsReportPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = usePaginatedQuery(
    ['report-issued-cards', debouncedSearch, status, from, to],
    (p) =>
      fetchIssuedCardsReport({
        page: p,
        q: debouncedSearch || undefined,
        status: status || undefined,
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
        icon={<CreditCard />}
        title="البطاقات المُصدَرة"
        subtitle="كل بطاقات الولاء المُصدَرة للعملاء"
      />

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">بحث (عميل أو رقم تسلسلي)</Label>
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
          <Label className="text-xs text-muted-foreground">الحالة</Label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">الكل</option>
            <option value="active">نشطة</option>
            <option value="expired">منتهية</option>
            <option value="revoked">ملغاة</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">من تاريخ الإصدار</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
            className="mt-1 h-9"
            dir="ltr"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">إلى تاريخ الإصدار</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
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
                  <th className="text-start px-4 py-3 font-medium">الرقم التسلسلي</th>
                  <th className="text-start px-4 py-3 font-medium">الأختام</th>
                  <th className="text-start px-4 py-3 font-medium">استبدال</th>
                  <th className="text-start px-4 py-3 font-medium">الحالة</th>
                  <th className="text-start px-4 py-3 font-medium">تاريخ الإصدار</th>
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
                    <td className="px-4 py-3 text-xs">{row.card_template?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[11px] font-mono" dir="ltr">
                      <Link
                        href={`/i/${row.serial_number}`}
                        className="hover:text-primary transition"
                      >
                        {row.serial_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-600">{row.stamps_count}</td>
                    <td className="px-4 py-3 text-xs">{row.totals.redemptions}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={row.status === 'active' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {row.status === 'active'
                          ? 'نشطة'
                          : row.status === 'expired'
                            ? 'منتهية'
                            : row.status === 'revoked'
                              ? 'ملغاة'
                              : row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDate(row.issued_at)}
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
