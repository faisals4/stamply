import { useState } from 'react'
import { useLocation } from 'wouter'
import {
  Send,
  Bell,
  CheckCircle2,
  XCircle,
  Megaphone,
  Sparkles,
  Building2,
  Search,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { FilterPills } from '@/components/ui/filter-pills'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { formatDate } from '@/lib/utils/date'
import {
  listOpNotifications,
  type OpNotificationListItem,
  type OpNotificationType,
} from '@/lib/api/op/notifications'

/**
 * /op/notifications
 *
 * Single-screen operator console for Stamply's push-notification system.
 * Layout mirrors OpCustomers / OpTenants: PageHeader at the top, search
 * + filter row, then a card-wrapped table, with a shared Pagination
 * footer.
 *
 * - "Send notification" (header action) navigates to /op/notifications/send
 * - Row click navigates to /op/notifications/:id (full detail page)
 *
 * Neither flow uses a modal, so the URL always reflects what the
 * operator is looking at (back-button friendly, shareable).
 */

type TypeFilter = 'all' | OpNotificationType

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'broadcast', label: 'إعلاني — عام' },
  { key: 'tenant_broadcast', label: 'إعلاني — متجر' },
  { key: 'event', label: 'تلقائي (أحداث)' },
]

export default function OpNotificationsPage() {
  const [, setLocation] = useLocation()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = usePaginatedQuery<OpNotificationListItem>(
    ['op-notifications', typeFilter, debouncedSearch],
    (p) =>
      listOpNotifications({
        page: p,
        type: typeFilter === 'all' ? undefined : typeFilter,
        q: debouncedSearch || undefined,
      }),
    page,
  )

  const items = data?.data ?? []
  const meta = data?.meta

  return (
    <div>
      <PageHeader
        icon={<Bell />}
        title="الإشعارات"
        subtitle="إرسال الإشعارات الإعلانية وعرض سجل كل ما تم إرساله"
        action={
          <Button onClick={() => setLocation('/op/notifications/send')}>
            <Send className="w-4 h-4 me-1.5" />
            إرسال إشعار
          </Button>
        }
      />

      {/* Search + filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="ابحث في العنوان أو النص..."
            className="ps-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <FilterPills
          items={TYPE_FILTERS}
          selected={typeFilter}
          onSelect={(k) => {
            setTypeFilter(k)
            setPage(1)
          }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            جارٍ التحميل...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              لم يتم إرسال أي إشعارات بعد
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">النوع</th>
                  <th className="text-start px-4 py-3 font-medium">العنوان</th>
                  <th className="text-start px-4 py-3 font-medium">المتجر</th>
                  <th className="text-start px-4 py-3 font-medium">الوصول</th>
                  <th className="text-start px-4 py-3 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr
                    key={n.id}
                    onClick={() => setLocation(`/op/notifications/${n.id}`)}
                    className="border-t hover:bg-muted transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <TypeBadge type={n.type} />
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="font-medium truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {n.body}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {n.tenant?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <DeliveryChip
                        target={n.target_count}
                        sent={n.sent_count}
                        failed={n.failed_count}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(n.sent_at ?? n.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <Pagination meta={meta} onPageChange={setPage} />
      )}

      {meta && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          إجمالي {meta.total} إشعار
        </p>
      )}
    </div>
  )
}

// -----------------------------------------------------------------
// Row helpers
// -----------------------------------------------------------------

function TypeBadge({ type }: { type: OpNotificationType }) {
  if (type === 'broadcast') {
    return (
      <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 border">
        <Megaphone className="w-3 h-3 me-1" />
        إعلاني — عام
      </Badge>
    )
  }
  if (type === 'tenant_broadcast') {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 border">
        <Building2 className="w-3 h-3 me-1" />
        إعلاني — متجر
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">
      <Sparkles className="w-3 h-3 me-1" />
      تلقائي
    </Badge>
  )
}

function DeliveryChip({
  target,
  sent,
  failed,
}: {
  target: number
  sent: number
  failed: number
}) {
  // Three-up tally rendered inline so the table column stays narrow.
  // Failed count is hidden when zero to keep the row visually calm.
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <span className="font-medium">{target.toLocaleString('ar')}</span>
      <span className="flex items-center gap-1 text-emerald-600">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {sent.toLocaleString('ar')}
      </span>
      {failed > 0 && (
        <span className="flex items-center gap-1 text-red-500">
          <XCircle className="w-3.5 h-3.5" />
          {failed.toLocaleString('ar')}
        </span>
      )}
    </div>
  )
}
