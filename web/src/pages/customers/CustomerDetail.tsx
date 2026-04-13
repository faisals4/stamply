import { useState } from 'react'
import { useRoute, Link } from 'wouter'
import { FullPageLoader } from '@/components/ui/spinner'
import { useQuery } from '@tanstack/react-query'
import {
  Phone,
  Mail,
  CalendarDays,
  Cake,
  Gift,
  Stamp,
  ExternalLink,
  Copy,
  Check,
  CreditCard,
  Award,
  TrendingUp,
  X,
  UserCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { BackButton } from '@/components/ui/back-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PageHeader } from '@/components/ui/page-header'
import { getCustomer, fetchCardActivity } from '@/lib/api/misc'
import { formatDateTime } from '@/lib/utils/date'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { CardVisual } from '@/components/card/CardVisual'
import { EditableProfile } from './EditableProfile'
import type { CustomerCardDetail, ActivityEntry } from '@/types/customer'
import type { CardTemplate } from '@/types/card'

export default function CustomerDetailPage() {
  const [, params] = useRoute('/admin/customers/:id')
  const id = params?.id ?? ''

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
    enabled: !!id,
  })

  if (isLoading) {
    return <FullPageLoader />
  }

  if (error || !customer) {
    return (
      <div>
        <Link href="/admin/customers" className="text-sm text-primary hover:underline">
          ← رجوع للعملاء
        </Link>
        <div className="mt-6 text-sm text-muted-foreground">العميل غير موجود</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header / breadcrumb */}
      <BackButton href="/admin/customers" label="العملاء" />
      <PageHeader
        icon={<UserCircle />}
        title={customer.full_name}
        subtitle={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5" dir="ltr">
              <Phone className="w-3.5 h-3.5" />
              {customer.phone}
            </span>
            {customer.email && (
              <span className="inline-flex items-center gap-1.5" dir="ltr">
                <Mail className="w-3.5 h-3.5" />
                {customer.email}
              </span>
            )}
            {customer.birthdate && (
              <span className="inline-flex items-center gap-1.5">
                <Cake className="w-3.5 h-3.5" />
                {customer.birthdate}
              </span>
            )}
          </span>
        }
      />

      {/* Editable profile block */}
      <EditableProfile customer={customer} />

      {/* Customer-level stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatBox
          icon={<CreditCard className="w-4 h-4 text-violet-500" />}
          label="البطاقات"
          value={customer.stats.cards_count}
        />
        <StatBox
          icon={<Stamp className="w-4 h-4 text-amber-500" />}
          label="إجمالي الأختام المكتسبة"
          value={customer.stats.total_stamps_earned}
        />
        <StatBox
          icon={<Award className="w-4 h-4 text-emerald-500" />}
          label="المكافآت المستبدلة"
          value={customer.stats.total_rewards_redeemed}
        />
        <StatBox
          icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
          label="أيام منذ التسجيل"
          value={Math.round(customer.stats.days_since_signup ?? 0)}
        />
      </div>

      {/* Cards section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">البطاقات ({customer.issued_cards.length})</h2>

        {customer.issued_cards.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            لا توجد بطاقات
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              // Group by template to compute "card X of Y" indicators. Only
              // show the indicator when the customer has more than one card
              // of the same template.
              const byTemplate = new Map<number, number>()
              customer.issued_cards.forEach((c) => {
                byTemplate.set(c.template.id, (byTemplate.get(c.template.id) ?? 0) + 1)
              })
              const seenIdx = new Map<number, number>()
              return customer.issued_cards.map((card) => {
                const total = byTemplate.get(card.template.id) ?? 1
                const idx = (seenIdx.get(card.template.id) ?? 0) + 1
                seenIdx.set(card.template.id, idx)
                return (
                  <CardBlock
                    key={card.id}
                    card={card}
                    customerId={customer.id}
                    customerName={customer.full_name}
                    cardIndex={total > 1 ? idx : null}
                    cardTotal={total > 1 ? total : null}
                  />
                )
              })
            })()}
          </div>
        )}
      </section>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}

function CardBlock({
  card,
  customerId,
  customerName,
  cardIndex,
  cardTotal,
}: {
  card: CustomerCardDetail
  customerId: number
  customerName: string
  cardIndex: number | null
  cardTotal: number | null
}) {
  const [copied, setCopied] = useState(false)
  const fullViewUrl = `${window.location.origin}${card.view_url}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullViewUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Card header */}
      <div className="p-5 border-b flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-semibold text-base">{card.template.name}</div>
            {cardIndex !== null && cardTotal !== null && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                title={`البطاقة ${cardIndex} من ${cardTotal} من نفس القالب`}
              >
                #{cardIndex} من {cardTotal}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
              {card.status === 'active' ? 'نشط' : card.status}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono" dir="ltr">
              {card.serial_number}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={copyLink}
                aria-label={copied ? 'تم النسخ' : 'نسخ رابط البطاقة'}
                className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-gray-100 text-[#635C70] hover:bg-[#8B52F6] hover:text-white transition-all duration-200"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{copied ? 'تم النسخ' : 'نسخ رابط البطاقة'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={card.view_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="فتح البطاقة"
                className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-[#8B52F6] text-white hover:bg-[#7A42E0] transition-all duration-200"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>فتح البطاقة</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Card body: visual + stats + activity */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Mini card visual */}
        <div>
          <CardVisual
            card={{
              name: card.template.name,
              design: card.template.design,
              rewards: [],
            } as unknown as CardTemplate}
            collectedStamps={card.stamps_count}
            customerName={customerName}
            qrValue={card.serial_number}
            showQr={false}
          />
        </div>

        {/* Right column: stats + activity */}
        <div>
          {/* Per-card stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <MiniStat
              label="الأختام الحالية"
              value={card.stamps_count}
              color="text-amber-500"
            />
            <MiniStat
              label="إجمالي المكتسبة"
              value={card.stats.stamps_earned}
              color="text-violet-500"
            />
            <MiniStat
              label="مكافآت مستبدلة"
              value={card.stats.rewards_redeemed}
              color="text-emerald-500"
            />
          </div>

          {/* Activity log */}
          <ActivityLog customerId={customerId} cardId={card.id} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */
/*  Activity log — table style (same as report pages)              */
/*  Collapsed:  last 5 rows, no filters                            */
/*  Expanded:   full table, 25/page, filters, numbered pagination  */
/* ────────────────────────────────────────────────────────────── */

type ActivityKindFilter = '' | 'stamp' | 'redemption'

function ActivityLog({ customerId, cardId }: { customerId: number; cardId: number }) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [kindFilter, setKindFilter] = useState<ActivityKindFilter>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // When collapsed we always fetch the first 5; when expanded we honour the
  // current page + filters. The query key differentiates so the two modes
  // don't clobber each other's cache.
  const { data, isLoading } = usePaginatedQuery(
    ['card-activity', customerId, cardId, expanded, kindFilter, dateFrom, dateTo],
    (p) =>
      fetchCardActivity(customerId, cardId, {
        page: expanded ? p : 1,
        per_page: expanded ? 25 : 5,
        kind: expanded && kindFilter ? kindFilter : undefined,
        from: expanded && dateFrom ? dateFrom : undefined,
        to: expanded && dateTo ? dateTo : undefined,
      }),
    expanded ? page : 1,
  )

  const entries = data?.data ?? []
  const meta = data?.meta
  const hasActiveFilters = expanded && (kindFilter !== '' || !!dateFrom || !!dateTo)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          سجل النشاط {meta ? `(${meta.total})` : ''}
        </h3>
        {expanded && (
          <button
            type="button"
            onClick={() => {
              setExpanded(false)
              setKindFilter('')
              setDateFrom('')
              setDateTo('')
              setPage(1)
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            طيّ
          </button>
        )}
      </div>

      {/* Filters panel — only in expanded mode */}
      {expanded && (
        <div className="rounded-lg border bg-muted/30 p-3 mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">نوع العملية</Label>
            <select
              value={kindFilter}
              onChange={(e) => {
                setKindFilter(e.target.value as ActivityKindFilter)
                setPage(1)
              }}
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">الكل</option>
              <option value="stamp">أختام</option>
              <option value="redemption">استبدال</option>
            </select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">من تاريخ</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              className="mt-1 h-8 text-xs"
              dir="ltr"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">إلى تاريخ</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              className="mt-1 h-8 text-xs"
              dir="ltr"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-muted-foreground">جارٍ التحميل...</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {hasActiveFilters ? 'لا توجد نتائج مطابقة للفلاتر' : 'لا يوجد نشاط بعد'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">النوع</th>
                  <th className="text-start px-3 py-2 font-medium">التفاصيل</th>
                  <th className="text-start px-3 py-2 font-medium">بواسطة</th>
                  <th className="text-start px-3 py-2 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <ActivityTableRow key={i} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer — either "المزيد" button (collapsed) or numbered paginator */}
        {expanded ? (
          <div className="px-4 pb-4">
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        ) : (
          meta && meta.total > 5 && (
            <div className="px-4 py-3 border-t bg-muted/20 text-center">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                عرض المزيد ({meta.total - entries.length} عملية إضافية)
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

/** Single row in the activity table — replaces the card-style `<ActivityRow>`. */
function ActivityTableRow({ entry }: { entry: ActivityEntry }) {
  const date = formatDateTime(entry.at)

  if (entry.kind === 'stamp') {
    const reasonLabel: Record<string, string> = {
      manual: 'يدوي',
      welcome: 'ترحيبي',
      birthday: 'عيد ميلاد',
      automation: 'أتمتة',
      refund: 'استرجاع',
      spend: 'إنفاق',
      visit: 'زيارة',
      product: 'منتج',
    }
    const positive = (entry.count ?? 0) > 0
    return (
      <tr className="border-t hover:bg-muted/20 transition">
        <td className="px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <Stamp className="w-3 h-3 text-amber-600" />
            ختم
          </span>
        </td>
        <td className="px-3 py-2">
          <span className={positive ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
            {positive ? `+${entry.count}` : entry.count}
          </span>
          <span className="text-[11px] text-muted-foreground ms-1.5">
            ({reasonLabel[entry.reason ?? 'manual'] ?? entry.reason})
          </span>
        </td>
        <td className="px-3 py-2 text-[11px]">{entry.by ?? '—'}</td>
        <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{date}</td>
      </tr>
    )
  }

  // Redemption
  return (
    <tr className="border-t hover:bg-muted/20 transition">
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          <Gift className="w-3 h-3 text-emerald-600" />
          استبدال
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-xs">{entry.reward_name ?? '—'}</div>
        {entry.code && (
          <div className="text-[10px] text-muted-foreground font-mono" dir="ltr">
            {entry.code}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-[11px]">—</td>
      <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{date}</td>
    </tr>
  )
}
