import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Mail,
  Smartphone,
  Bell,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  Globe,
  Apple,
  Wallet,
  CreditCard,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DataTable,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTh,
  DataTd,
} from '@/components/ui/data-table'
import {
  listReachableCustomers,
  type ReachChannel,
  type ReachableCustomer,
  type ReachableDevice,
  type InstalledCard,
} from '@/lib/api/messages'
import { formatDate } from '@/lib/utils/date'

/**
 * Modal that lists the customers reachable on a given channel.
 *
 * Scale strategy: server-side paginated via `listReachableCustomers`.
 * Each page fetches only the current 25 rows (backend defaults),
 * React Query caches per (channel, page) key, and
 * `placeholderData: keepPreviousData` keeps the previous page visible
 * while the next page loads so there's no empty-state flash at any
 * scale — works cleanly from 10 rows to 10 million.
 *
 * Clicking a row opens the customer's profile in a new tab via the
 * shared <DataTableRow href=... hrefTarget="new" /> primitive.
 */
export function ReachableCustomersDialog({
  channel,
  onClose,
}: {
  channel: ReachChannel | null
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const isOpen = channel !== null

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['messages', 'reach', channel, page],
    queryFn: () => listReachableCustomers(channel!, { page }),
    enabled: isOpen,
    staleTime: 30_000,
    // Keep the previous page on screen while the next one loads —
    // eliminates the empty-state flash between page navigations at
    // any dataset size.
    placeholderData: keepPreviousData,
  })

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      // Reset paging so the next open starts at page 1.
      setPage(1)
    }
  }

  const meta = data?.meta
  const customers = data?.data ?? []

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        dir="rtl"
        className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col text-right"
      >
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle className="flex items-center gap-2">
            {channel === 'wallet' && <Wallet className="w-5 h-5 text-indigo-600" />}
            {channel === 'push' && <Bell className="w-5 h-5 text-amber-600" />}
            {channel === 'email' && <Mail className="w-5 h-5 text-blue-600" />}
            {channel === 'sms' && <Smartphone className="w-5 h-5 text-emerald-600" />}
            {channelTitle(channel)}
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? 'جارٍ تحميل القائمة...'
              : `إجمالي ${meta?.total ?? 0} عميل يمكن الوصول إليهم عبر هذه القناة`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-6 px-6 relative">
          {/* Subtle refetch indicator — only the background fades,
              never swaps the table for a spinner. */}
          {isFetching && !isLoading && (
            <div className="absolute top-0 inset-x-0 h-0.5 bg-primary/30 animate-pulse z-20" />
          )}

          {isLoading ? (
            <div className="py-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin me-2" />
              جارٍ التحميل...
            </div>
          ) : customers.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                لا يوجد عملاء في هذه القناة بعد
              </p>
            </div>
          ) : channel === 'wallet' ? (
            <WalletTable customers={customers} />
          ) : channel === 'push' ? (
            <PushTable customers={customers} />
          ) : channel === 'email' ? (
            <EmailTable customers={customers} />
          ) : (
            <SmsTable customers={customers} />
          )}
        </div>

        {/* Pagination bar — only renders when there's more than one page */}
        {meta && meta.last_page > 1 && (
          <div className="border-t pt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              صفحة <span className="font-semibold">{meta.current_page}</span> من{' '}
              <span className="font-semibold">{meta.last_page}</span>
              <span className="text-muted-foreground/60">
                {' '}
                · {meta.total.toLocaleString('ar-SA')} عميل
              </span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md border disabled:opacity-30 hover:bg-muted"
                aria-label="السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= meta.last_page || isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md border disabled:opacity-30 hover:bg-muted"
                aria-label="التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function channelTitle(channel: ReachChannel | null): string {
  switch (channel) {
    case 'wallet':
      return 'حاملو بطاقات Apple Wallet'
    case 'push':
      return 'المشتركون في تنبيهات المتصفّح'
    case 'email':
      return 'العملاء الذين لديهم بريد إلكتروني'
    case 'sms':
      return 'العملاء الذين لديهم رقم جوال'
    default:
      return ''
  }
}

const rowHref = (id: number) => `/admin/customers/${id}`

/* ────────────────────────────────────────────────────────────── */
/*  Email table                                                   */
/* ────────────────────────────────────────────────────────────── */

function EmailTable({ customers }: { customers: ReachableCustomer[] }) {
  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTh>الاسم</DataTh>
          <DataTh>البريد الإلكتروني</DataTh>
          <DataTh>البطاقات</DataTh>
          <DataTh>آخر نشاط</DataTh>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {customers.map((c) => (
          <DataTableRow key={c.id} href={rowHref(c.id)} hrefTarget="new">
            <DataTd>
              <div className="font-medium">{c.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                {c.phone}
              </div>
            </DataTd>
            <DataTd mono dir="ltr">
              {c.email}
            </DataTd>
            <DataTd>{c.cards_count}</DataTd>
            <DataTd muted>{c.last_activity_at ? formatDate(c.last_activity_at) : '—'}</DataTd>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  )
}

/* ────────────────────────────────────────────────────────────── */
/*  SMS table                                                     */
/* ────────────────────────────────────────────────────────────── */

function SmsTable({ customers }: { customers: ReachableCustomer[] }) {
  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTh>الاسم</DataTh>
          <DataTh>رقم الجوال</DataTh>
          <DataTh>البطاقات</DataTh>
          <DataTh>آخر نشاط</DataTh>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {customers.map((c) => (
          <DataTableRow key={c.id} href={rowHref(c.id)} hrefTarget="new">
            <DataTd>
              <div className="font-medium">{c.name}</div>
            </DataTd>
            <DataTd mono dir="ltr">
              {c.phone}
            </DataTd>
            <DataTd>{c.cards_count}</DataTd>
            <DataTd muted>{c.last_activity_at ? formatDate(c.last_activity_at) : '—'}</DataTd>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  )
}

/* ────────────────────────────────────────────────────────────── */
/*  Push table                                                    */
/* ────────────────────────────────────────────────────────────── */

function PushTable({ customers }: { customers: ReachableCustomer[] }) {
  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTh>الاسم</DataTh>
          <DataTh>الأجهزة المسجّلة</DataTh>
          <DataTh>البطاقات</DataTh>
          <DataTh>آخر نشاط</DataTh>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {customers.map((c) => (
          <DataTableRow
            key={c.id}
            href={rowHref(c.id)}
            hrefTarget="new"
            align="top"
          >
            <DataTd>
              <div className="font-medium">{c.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                {c.phone}
              </div>
            </DataTd>
            <DataTd>
              <div className="flex flex-col gap-1.5 py-0.5">
                {(c.devices ?? []).map((d) => (
                  <DeviceChip key={d.id} device={d} />
                ))}
              </div>
            </DataTd>
            <DataTd>{c.cards_count}</DataTd>
            <DataTd muted>{c.last_activity_at ? formatDate(c.last_activity_at) : '—'}</DataTd>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  )
}

/* ────────────────────────────────────────────────────────────── */
/*  Wallet table                                                  */
/* ────────────────────────────────────────────────────────────── */

function WalletTable({ customers }: { customers: ReachableCustomer[] }) {
  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTh>الاسم</DataTh>
          <DataTh>البطاقات المُثبَّتة</DataTh>
          <DataTh>إجمالي الأجهزة</DataTh>
          <DataTh>آخر نشاط</DataTh>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {customers.map((c) => {
          const installed = c.installed_cards ?? []
          const totalDevices = installed.reduce(
            (sum, card) => sum + card.devices_count,
            0,
          )
          return (
            <DataTableRow
              key={c.id}
              href={rowHref(c.id)}
              hrefTarget="new"
              align="top"
            >
              <DataTd>
                <div className="font-medium">{c.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                  {c.phone}
                </div>
              </DataTd>
              <DataTd>
                <div className="flex flex-col gap-1.5 py-0.5">
                  {installed.map((card) => (
                    <InstalledCardChip key={card.id} card={card} />
                  ))}
                </div>
              </DataTd>
              <DataTd>
                <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums">
                  <Smartphone className="w-3 h-3 text-muted-foreground" />
                  {totalDevices}
                </span>
              </DataTd>
              <DataTd muted>
                {c.last_activity_at ? formatDate(c.last_activity_at) : '—'}
              </DataTd>
            </DataTableRow>
          )
        })}
      </DataTableBody>
    </DataTable>
  )
}

function InstalledCardChip({ card }: { card: InstalledCard }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-[11px] w-fit">
      <CreditCard className="w-3 h-3 text-muted-foreground" />
      <span className="font-mono" dir="ltr">
        {card.serial_number}
      </span>
      <span className="text-muted-foreground">
        · {card.stamps_count} ختم
      </span>
      <span className="text-muted-foreground">
        · {card.devices_count} جهاز
      </span>
    </div>
  )
}

function DeviceChip({ device }: { device: ReachableDevice }) {
  const platformLabel =
    device.platform === 'web'
      ? 'متصفّح'
      : device.platform === 'ios'
        ? 'iOS'
        : 'Android'

  const Icon =
    device.platform === 'web'
      ? Globe
      : device.platform === 'ios'
        ? Apple
        : Smartphone

  // Summarise the UA into something human: "Chrome" / "Safari" etc.
  const uaSummary = summariseUserAgent(device.user_agent)

  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-[11px] w-fit">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="font-medium">{platformLabel}</span>
      {uaSummary && <span className="text-muted-foreground">· {uaSummary}</span>}
      <span className="text-muted-foreground">
        · اشترك {formatDate(device.subscribed_at)}
      </span>
      {device.last_seen_at && (
        <span className="text-emerald-600">· آخر تسليم {formatDate(device.last_seen_at)}</span>
      )}
    </div>
  )
}

function summariseUserAgent(ua: string | null): string {
  if (!ua) return ''
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari'
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera'
  return ''
}
