import { useState } from 'react'
import { useLocation } from 'wouter'
import { Users, ShieldCheck, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { listOpCustomers, type OpCustomerListItem } from '@/lib/api/op'
import { formatDate } from '@/lib/utils/date'

export default function OpCustomersPage() {
  const [, setLocation] = useLocation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = usePaginatedQuery<OpCustomerListItem>(
    ['op-customers', debouncedSearch],
    (p) => listOpCustomers({ page: p, q: debouncedSearch || undefined }),
    page,
  )

  const customers = data?.data ?? []
  const meta = data?.meta

  return (
    <div>
      <PageHeader
        icon={<Users />}
        title="العملاء"
        subtitle="جميع العملاء المسجلين عبر كل المتاجر"
      />

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="ابحث بالاسم أو الهاتف أو الإيميل..."
            className="ps-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">لا يوجد عملاء مطابقين</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">العميل</th>
                  <th className="text-start px-4 py-3 font-medium">الهاتف</th>
                  <th className="text-start px-4 py-3 font-medium">الإيميل</th>
                  <th className="text-start px-4 py-3 font-medium">التوثيق</th>
                  <th className="text-start px-4 py-3 font-medium">المتاجر</th>
                  <th className="text-start px-4 py-3 font-medium">البطاقات</th>
                  <th className="text-start px-4 py-3 font-medium">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setLocation(`/op/customers/${c.id}`)}
                    className="border-t hover:bg-muted transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.full_name || '—'}</div>
                      {c.gender && (
                        <span className="text-[11px] text-muted-foreground">
                          {c.gender === 'male' ? 'ذكر' : 'أنثى'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs" dir="ltr">
                      {c.phone}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs" dir="ltr">
                      {c.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.phone_verified_at ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border text-[10px]">
                          <ShieldCheck className="w-3 h-3 me-1" />
                          موثّق
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.tenants_count}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.issued_cards_count}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="mt-4">
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}

      {meta && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          إجمالي {meta.total} عميل
        </p>
      )}
    </div>
  )
}
