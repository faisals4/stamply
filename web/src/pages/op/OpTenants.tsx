import { useState } from 'react'
import { useLocation } from 'wouter'
import { useQueryClient } from '@tanstack/react-query'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Pagination } from '@/components/ui/pagination'
import { formatDate } from '@/lib/utils/date'
import {
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  LogIn,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import {
  listOpTenants,
  impersonateTenant,
  type OpTenantListItem,
} from '@/lib/api/op'
import { cn } from '@/lib/utils'

/**
 * /op/tenants — full list of merchants on the platform.
 */
export default function OpTenantsPage() {
  const [, setLocation] = useLocation()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = usePaginatedQuery(
    ['op-tenants', debouncedSearch, statusFilter],
    (p) =>
      listOpTenants({
        page: p,
        q: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    page,
  )
  const tenants = data?.data ?? []
  const meta = data?.meta

  const handleImpersonate = async (e: React.MouseEvent, t: OpTenantListItem) => {
    e.stopPropagation()
    try {
      const { token, user } = await impersonateTenant(t.id)
      // Store merchant credentials and open admin dashboard in new tab
      localStorage.setItem('stamply.token', token)
      localStorage.setItem('stamply.user', JSON.stringify(user))
      window.open('/admin', '_blank')
    } catch {
      alert('تعذر الدخول — تحقق من وجود مدير للمتجر')
    }
  }

  return (
    <div>
      <PageHeader
        icon={<Building2 />}
        title="التجار"
        subtitle="كل المستأجرين (Tenants) المسجّلين في المنصة"
      />

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
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

        <div className="grid grid-cols-3 sm:flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s)
                setPage(1)
              }}
              className={cn(
                'text-xs px-2 sm:px-3 py-2 rounded-md border transition whitespace-nowrap',
                statusFilter === s
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-card border-border text-muted-foreground hover:border-ring',
              )}
            >
              {s === 'all' ? 'الكل' : s === 'active' ? 'نشط' : 'معطّل'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد نتائج</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-start px-4 py-3 font-medium">التاجر</th>
                <th className="text-start px-4 py-3 font-medium">المُعرِّف</th>
                <th className="text-start px-4 py-3 font-medium">الخطة</th>
                <th className="text-start px-4 py-3 font-medium">الحالة</th>
                <th className="text-start px-4 py-3 font-medium">المستخدمون</th>
                <th className="text-start px-4 py-3 font-medium">البطاقات</th>
                <th className="text-start px-4 py-3 font-medium">تاريخ التسجيل</th>
                <th className="text-start px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setLocation(`/op/tenants/${t.id}`)}
                  className="border-t hover:bg-muted transition cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {t.logo ? (
                          <img
                            src={t.logo}
                            alt=""
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Building2 className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <div className="font-medium">{t.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground" dir="ltr">
                    {t.subdomain}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                        <XCircle className="w-2.5 h-2.5" />
                        معطّل
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.users_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.card_templates_count}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(t.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleImpersonate(e, t)}
                      className="text-xs gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      دخول
                    </Button>
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

      <p className="mt-4 text-xs text-muted-foreground text-center">
        {tenants.length} تاجر{' '}
        {statusFilter !== 'all' && `(${statusFilter === 'active' ? 'نشط' : 'معطّل'})`}
      </p>
    </div>
  )
}
