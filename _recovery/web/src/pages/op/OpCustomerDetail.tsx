import { useState } from 'react'
import { useRoute, useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import {
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  CreditCard,
  Stamp,
  Gift,
  Building2,
  User,
  Bell,
  Lock,
  Smartphone,
  Heart,
} from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { Badge } from '@/components/ui/badge'
import { getOpCustomer, listOpCustomerCards } from '@/lib/api/op'
import { Pagination } from '@/components/ui/pagination'
import { formatDate, formatDateTime } from '@/lib/utils/date'

export default function OpCustomerDetailPage() {
  const [, setLocation] = useLocation()
  const [, params] = useRoute('/op/customers/:id')
  const id = params?.id

  const { data: customer, isLoading } = useQuery({
    queryKey: ['op-customers', 'detail', id],
    queryFn: () => getOpCustomer(id!),
    enabled: !!id,
  })

  const [tenantsPage, setTenantsPage] = useState(1)
  const [favPage, setFavPage] = useState(1)
  const [cardsPage, setCardsPage] = useState(1)
  const PER_PAGE = 10

  // Server-side paginated cards
  const { data: cardsData } = usePaginatedQuery(
    ['op-customer-cards', id],
    (p) => listOpCustomerCards(id!, { page: p }),
    cardsPage,
    { enabled: !!id },
  )
  const cardsSlice = cardsData?.data ?? []
  const cardsMeta = cardsData?.meta

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
  if (!customer) return <div className="text-center py-16 text-muted-foreground">العميل غير موجود</div>

  const tenantsSlice = customer.tenants.slice((tenantsPage - 1) * PER_PAGE, tenantsPage * PER_PAGE)
  const tenantsPages = Math.ceil(customer.tenants.length / PER_PAGE)
  const favSlice = customer.favorites.slice((favPage - 1) * PER_PAGE, favPage * PER_PAGE)
  const favPages = Math.ceil(customer.favorites.length / PER_PAGE)

  return (
    <div>
      <BackButton href="/op/customers" />

      {/* Header */}
      <div className="flex items-center gap-4 mt-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">
            {customer.full_name || 'بدون اسم'}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span dir="ltr">{customer.phone}</span>
            {customer.phone_verified_at && (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border text-[10px]">
                <ShieldCheck className="w-3 h-3 me-1" />
                موثّق
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBox icon={<Building2 className="w-4 h-4 text-violet-500" />} label="المتاجر" value={customer.stats.tenants} />
        <StatBox icon={<CreditCard className="w-4 h-4 text-violet-500" />} label="البطاقات" value={customer.stats.issued_cards} />
        <StatBox icon={<Stamp className="w-4 h-4 text-amber-500" />} label="الأختام" value={customer.stats.stamps} />
        <StatBox icon={<Gift className="w-4 h-4 text-emerald-500" />} label="الاستبدالات" value={customer.stats.redemptions} />
        <StatBox icon={<Bell className="w-4 h-4 text-violet-400" />} label="أجهزة الإشعارات" value={customer.stats.push_tokens} />
      </div>

      {/* Profile info */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="font-semibold mb-4">معلومات العميل</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <InfoRow icon={<Phone className="w-4 h-4" />} label="الهاتف" value={customer.phone} dir="ltr" />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="الإيميل" value={customer.email || '—'} dir="ltr" />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="تاريخ الميلاد" value={customer.birthdate ? formatDate(customer.birthdate) : '—'} />
          <InfoRow icon={<User className="w-4 h-4" />} label="الجنس" value={customer.gender === 'male' ? 'ذكر' : customer.gender === 'female' ? 'أنثى' : '—'} />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="تاريخ التسجيل" value={formatDate(customer.created_at)} />
          <InfoRow
            icon={<ShieldCheck className="w-4 h-4" />}
            label="التوثيق"
            value={customer.phone_verified_at ? `موثّق — ${formatDate(customer.phone_verified_at)}` : 'غير موثّق'}
          />
          {customer.locked_fields.length > 0 && (
            <InfoRow
              icon={<Lock className="w-4 h-4" />}
              label="حقول مقفلة"
              value={customer.locked_fields.join('، ')}
            />
          )}
        </div>
      </div>

      {/* Tenants enrolled */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">المتاجر المسجل فيها ({customer.tenants.length})</h2>
        </div>
        {customer.tenants.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">لا توجد متاجر</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-3 font-medium">المتجر</th>
                    <th className="text-start px-4 py-3 font-medium">البطاقات</th>
                    <th className="text-start px-4 py-3 font-medium">المصدر</th>
                    <th className="text-start px-4 py-3 font-medium">آخر نشاط</th>
                    <th className="text-start px-4 py-3 font-medium">تاريخ الاشتراك</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantsSlice.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t hover:bg-muted transition cursor-pointer"
                      onClick={() => setLocation(`/op/tenants/${t.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{t.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.issued_cards_count}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{t.source_utm || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{t.last_activity_at ? formatDateTime(t.last_activity_at) : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tenantsPages > 1 && <MiniPagination current={tenantsPage} total={tenantsPages} onChange={setTenantsPage} />}
          </>
        )}
      </div>

      {/* Favorites */}
      {customer.favorites.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              المتاجر المفضّلة ({customer.favorites.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">المتجر</th>
                  <th className="text-start px-4 py-3 font-medium">تاريخ الإضافة</th>
                </tr>
              </thead>
              <tbody>
                {favSlice.map((f) => (
                  <tr
                    key={f.id}
                    className="border-t hover:bg-muted transition cursor-pointer"
                    onClick={() => setLocation(`/op/tenants/${f.tenant_id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{f.tenant_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(f.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {favPages > 1 && <MiniPagination current={favPage} total={favPages} onChange={setFavPage} />}
        </div>
      )}

      {/* Issued cards */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">البطاقات المُصدَرة ({cardsMeta?.total ?? customer.stats.issued_cards})</h2>
        </div>
        {cardsSlice.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">لا توجد بطاقات</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-3 font-medium">البطاقة</th>
                    <th className="text-start px-4 py-3 font-medium">الرقم التسلسلي</th>
                    <th className="text-start px-4 py-3 font-medium">الأختام</th>
                    <th className="text-start px-4 py-3 font-medium">الحالة</th>
                    <th className="text-start px-4 py-3 font-medium">المحفظة</th>
                    <th className="text-start px-4 py-3 font-medium">تاريخ الإصدار</th>
                    <th className="text-start px-4 py-3 font-medium">آخر استخدام</th>
                  </tr>
                </thead>
                <tbody>
                  {cardsSlice.map((ic) => (
                    <tr key={ic.id} className="border-t hover:bg-muted transition">
                      <td className="px-4 py-3 font-medium">{ic.card_name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground" dir="ltr">{ic.serial_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ic.stamps_count}</td>
                      <td className="px-4 py-3">
                        <Badge className={
                          ic.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border text-[10px]'
                            : 'bg-neutral-500/15 text-neutral-500 border-neutral-500/30 border text-[10px]'
                        }>
                          {ic.status === 'active' ? 'نشط' : ic.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {ic.installed_via ? (
                          <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 border text-[10px]">
                            <Smartphone className="w-3 h-3 me-1" />
                            {ic.installed_via === 'apple' ? 'Apple' : ic.installed_via === 'google' ? 'Google' : ic.installed_via}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{ic.issued_at ? formatDate(ic.issued_at) : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{ic.last_used_at ? formatDateTime(ic.last_used_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cardsMeta && cardsMeta.last_page > 1 && (
              <div className="py-3">
                <Pagination meta={cardsMeta} onPageChange={setCardsPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, dir }: { icon: React.ReactNode; label: string; value: string; dir?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div dir={dir}>{value}</div>
      </div>
    </div>
  )
}

function MiniPagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-1 py-3 border-t">
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={
            p === current
              ? 'w-8 h-8 rounded-lg bg-primary text-white text-xs font-medium'
              : 'w-8 h-8 rounded-lg text-muted-foreground text-xs hover:bg-muted transition'
          }
        >
          {p}
        </button>
      ))}
    </div>
  )
}
