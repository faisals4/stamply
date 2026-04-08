import { useEffect, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import { Users, Phone, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar-img'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { FilterPills } from '@/components/ui/filter-pills'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingBlock } from '@/components/ui/spinner'
import { listCustomers, type CustomerFilter } from '@/lib/api/misc'
import { useI18n } from '@/i18n'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { formatDateTime } from '@/lib/utils/date'

const FILTERS: { key: CustomerFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'active_week', label: 'نشطون هذا الأسبوع' },
  { key: 'active', label: 'نشطون (30 يوم)' },
  { key: 'inactive', label: 'غير نشطين' },
  { key: 'new', label: 'جدد (7 أيام)' },
  { key: 'new_month', label: 'جدد هذا الشهر' },
  { key: 'birthday_week', label: '🎂 أعياد ميلاد الأسبوع' },
  { key: 'birthday_month', label: '🎂 أعياد ميلاد الشهر' },
]

const VALID_FILTERS: CustomerFilter[] = [
  'all',
  'active',
  'active_week',
  'inactive',
  'new',
  'new_month',
  'birthday_week',
  'birthday_month',
]

export default function CustomersPage() {
  const { t } = useI18n()
  const [, setLocation] = useLocation()
  // Read initial filter from ?filter= query param so the Dashboard insight
  // cards can link directly to a filtered view (e.g. `/admin/customers?filter=active`).
  const searchString = useSearch()
  const initialFilter: CustomerFilter = (() => {
    const params = new URLSearchParams(searchString)
    const f = params.get('filter') as CustomerFilter | null
    return f && VALID_FILTERS.includes(f) ? f : 'all'
  })()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CustomerFilter>(initialFilter)
  const [page, setPage] = useState(1)

  // Keep state in sync with URL changes (user navigating between filters).
  useEffect(() => {
    const params = new URLSearchParams(searchString)
    const f = params.get('filter') as CustomerFilter | null
    if (f && VALID_FILTERS.includes(f)) {
      setFilter(f)
      setPage(1)
    }
  }, [searchString])

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = usePaginatedQuery(
    ['customers', debouncedSearch, filter],
    (p) => listCustomers(debouncedSearch || undefined, filter, p),
    page,
  )

  const customers = data?.data ?? []
  const meta = data?.meta

  return (
    <div>
      <PageHeader
        icon={<Users />}
        title={t('customers')}
        subtitle={
          <>
            قاعدة بيانات العملاء وبطاقاتهم المُصدَرة
            {meta && <span className="ms-2">— {meta.total} عميل</span>}
          </>
        }
      />

      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="ابحث بالاسم أو رقم الجوال أو البريد..."
        className="mb-3"
      />

      <FilterPills
        items={FILTERS}
        selected={filter}
        onSelect={(k) => {
          setFilter(k)
          setPage(1)
        }}
        className="mb-4"
      />

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            message={search ? 'لا توجد نتائج' : 'لم يسجّل أي عميل بعد'}
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-start px-4 py-3 font-medium">العميل</th>
                <th className="text-start px-4 py-3 font-medium">الجوال</th>
                <th className="text-start px-4 py-3 font-medium">البريد</th>
                <th className="text-start px-4 py-3 font-medium">البطاقات</th>
                <th className="text-start px-4 py-3 font-medium">آخر نشاط</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setLocation(`/admin/customers/${c.id}`)}
                  className="border-t hover:bg-muted/40 transition cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.full_name} email={c.email} size={32} />
                      <div className="font-medium">{c.full_name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      {c.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.email ? (
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <Mail className="w-3 h-3" />
                        {c.email}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{c.issued_cards_count}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDateTime(c.last_activity_at)}
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
