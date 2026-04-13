import { useLocation, useRoute } from 'wouter'
import { FullPageLoader } from '@/components/ui/spinner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Users,
  CreditCard,
  Stamp,
  Gift,
  MapPin,
  Bell,
  Mail,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Crown,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { DeleteButton } from '@/components/ui/delete-button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDateTime } from '@/lib/utils/date'
import {
  getOpTenant,
  toggleOpTenant,
  deleteOpTenant,
} from '@/lib/api/op'

export default function OpTenantDetailPage() {
  const [, setLocation] = useLocation()
  const [, params] = useRoute('/op/tenants/:id')
  const id = params?.id
  const qc = useQueryClient()

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['op-tenants', 'detail', id],
    queryFn: () => getOpTenant(id!),
    enabled: !!id,
  })

  const toggleMutation = useMutation({
    mutationFn: () => toggleOpTenant(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-tenants'] })
      qc.invalidateQueries({ queryKey: ['op-tenants', 'detail', id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteOpTenant(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-tenants'] })
      setLocation('/op/tenants')
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      alert(axiosErr.response?.data?.message ?? 'تعذر الحذف')
    },
  })

  if (isLoading || !tenant) return <FullPageLoader />

  const t = tenant as Record<string, unknown>
  const stats = (t.stats ?? {}) as Record<string, number>
  const subscription = (t.subscription ?? {}) as Record<string, unknown>
  const cardTemplates = (t.card_templates ?? []) as Array<Record<string, unknown>>
  const locations = (t.locations ?? []) as Array<Record<string, unknown>>
  const recentCustomers = (t.recent_customers ?? []) as Array<Record<string, unknown>>

  return (
    <div>
      <BackButton href="/op/tenants" label="التجار" />

      {/* Header */}
      <div className="flex items-start gap-4 mt-4 mb-6">
        {tenant.logo && (
          <img src={tenant.logo} alt="" className="w-14 h-14 rounded-2xl object-contain bg-gray-100" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{tenant.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground" dir="ltr">{tenant.subdomain}</span>
            {tenant.is_active ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border text-[10px]">
                <CheckCircle2 className="w-3 h-3 me-1" /> نشط
              </Badge>
            ) : (
              <Badge className="bg-red-500/15 text-red-600 border-red-500/30 border text-[10px]">
                <XCircle className="w-3 h-3 me-1" /> معطّل
              </Badge>
            )}
            <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 border text-[10px]">
              <Crown className="w-3 h-3 me-1" /> {tenant.plan}
            </Badge>
          </div>
          {tenant.description && (
            <p className="text-sm text-muted-foreground mt-2">{tenant.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              if (confirm(`${tenant.is_active ? 'تعطيل' : 'تفعيل'} التاجر "${tenant.name}"؟`))
                toggleMutation.mutate()
            }}
            disabled={toggleMutation.isPending}
          >
            {toggleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-1.5" />}
            {tenant.is_active ? 'تعطيل' : 'تفعيل'}
          </Button>
          <DeleteButton
            variant="wide"
            label="حذف التاجر"
            title="حذف التاجر"
            description={<>سيتم حذف <strong>{tenant.name}</strong> نهائياً مع كل البيانات.</>}
            confirmLabel="حذف"
            loading={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutateAsync()}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatBox icon={<Users className="w-4 h-4 text-violet-500" />} label="المستخدمون" value={stats.users ?? 0} />
        <StatBox icon={<CreditCard className="w-4 h-4 text-violet-500" />} label="قوالب البطاقات" value={stats.card_templates ?? 0} />
        <StatBox icon={<Users className="w-4 h-4 text-violet-500" />} label="العملاء" value={stats.customers ?? 0} />
        <StatBox icon={<CreditCard className="w-4 h-4 text-amber-500" />} label="بطاقات مُصدَرة" value={stats.issued_cards ?? 0} />
        <StatBox icon={<Stamp className="w-4 h-4 text-amber-500" />} label="الأختام" value={stats.stamps_given ?? 0} />
        <StatBox icon={<Gift className="w-4 h-4 text-emerald-500" />} label="الاستبدالات" value={stats.redemptions ?? 0} />
        <StatBox icon={<MapPin className="w-4 h-4 text-violet-400" />} label="الفروع" value={stats.locations ?? 0} />
        <StatBox icon={<Bell className="w-4 h-4 text-violet-400" />} label="أجهزة الإشعارات" value={stats.push_tokens ?? 0} />
        <StatBox icon={<Mail className="w-4 h-4 text-violet-400" />} label="رسائل مُرسلة" value={stats.messages_sent ?? 0} />
        <StatBox icon={<Activity className="w-4 h-4 text-emerald-500" />} label="نشطاء (30 يوم)" value={stats.active_customers ?? 0} />
      </div>

      {/* Subscription info */}
      <Section title="الاشتراك" icon={<Crown className="w-4 h-4 text-violet-500" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 text-sm">
          <InfoRow label="الخطة" value={String(subscription.plan ?? '—')} />
          <InfoRow label="السعر" value={subscription.plan_price ? `${subscription.plan_price} ر.س / ${subscription.plan_interval === 'yearly' ? 'سنوي' : 'شهري'}` : '—'} />
          <InfoRow label="بداية الاشتراك" value={subscription.subscription_starts_at ? formatDate(String(subscription.subscription_starts_at)) : '—'} />
          <InfoRow label="نهاية الاشتراك" value={subscription.subscription_ends_at ? formatDate(String(subscription.subscription_ends_at)) : '—'} />
          <InfoRow label="نهاية التجربة" value={subscription.trial_ends_at ? formatDate(String(subscription.trial_ends_at)) : '—'} />
          <InfoRow label="ملاحظات" value={String(subscription.subscription_notes ?? '—')} />
          <InfoRow label="تاريخ الإنشاء" value={formatDate(tenant.created_at)} />
        </div>
      </Section>

      {/* Users */}
      <Section title={`المستخدمون (${tenant.users.length})`} icon={<Users className="w-4 h-4 text-violet-500" />}>
        {tenant.users.length === 0 ? (
          <Empty text="لا يوجد مستخدمون" />
        ) : (
          <Table
            headers={['الاسم', 'البريد', 'الدور', 'تاريخ التسجيل']}
            rows={tenant.users.map((u) => [
              u.name,
              <span className="font-mono text-xs" dir="ltr">{u.email}</span>,
              <Badge className="bg-muted text-foreground text-[10px]">{u.role}</Badge>,
              formatDate(u.created_at),
            ])}
          />
        )}
      </Section>

      {/* Card templates */}
      <Section title={`قوالب البطاقات (${cardTemplates.length})`} icon={<CreditCard className="w-4 h-4 text-violet-500" />}>
        {cardTemplates.length === 0 ? (
          <Empty text="لا توجد بطاقات" />
        ) : (
          <Table
            headers={['البطاقة', 'النوع', 'الحالة', 'الطوابع', 'مُصدَرة', 'تاريخ الإنشاء']}
            rows={cardTemplates.map((c) => [
              String(c.name),
              String(c.type),
              <Badge className={c.status === 'active'
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border text-[10px]'
                : 'bg-neutral-500/15 text-neutral-500 border-neutral-500/30 border text-[10px]'
              }>{c.status === 'active' ? 'نشط' : String(c.status)}</Badge>,
              String(c.stamps_count ?? '—'),
              String(c.issued_cards_count ?? 0),
              formatDate(String(c.created_at)),
            ])}
          />
        )}
      </Section>

      {/* Locations */}
      <Section title={`الفروع (${locations.length})`} icon={<MapPin className="w-4 h-4 text-violet-500" />}>
        {locations.length === 0 ? (
          <Empty text="لا توجد فروع" />
        ) : (
          <Table
            headers={['الفرع', 'العنوان', 'النطاق', 'الحالة']}
            rows={locations.map((l) => [
              String(l.name),
              String(l.address ?? '—'),
              `${l.geofence_radius_m ?? 100}م`,
              <Badge className={l.is_active
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border text-[10px]'
                : 'bg-neutral-500/15 text-neutral-500 border-neutral-500/30 border text-[10px]'
              }>{l.is_active ? 'نشط' : 'معطّل'}</Badge>,
            ])}
          />
        )}
      </Section>

      {/* Recent customers */}
      <Section title={`أحدث العملاء (${recentCustomers.length})`} icon={<Users className="w-4 h-4 text-violet-500" />}>
        {recentCustomers.length === 0 ? (
          <Empty text="لا يوجد عملاء" />
        ) : (
          <Table
            headers={['العميل', 'الهاتف', 'الإيميل', 'المصدر', 'آخر نشاط', 'تاريخ التسجيل']}
            rows={recentCustomers.map((c) => [
              String(c.name || '—'),
              <span className="font-mono text-xs" dir="ltr">{String(c.phone ?? '—')}</span>,
              <span className="text-xs" dir="ltr">{String(c.email ?? '—')}</span>,
              String(c.source_utm ?? '—'),
              c.last_activity_at ? formatDateTime(String(c.last_activity_at)) : '—',
              formatDate(String(c.created_at)),
            ])}
          />
        )}
      </Section>
    </div>
  )
}

/* ── Helper components ─────────────────────────────────── */

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden mb-6">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-start px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted transition">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-muted-foreground">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
