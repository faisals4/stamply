import { useLocation, useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Users,
  CreditCard,
  Stamp,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { DeleteButton } from '@/components/ui/delete-button'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate } from '@/lib/formatDate'
import {
  getOpTenant,
  toggleOpTenant,
  deleteOpTenant,
} from '@/lib/opApi'

/**
 * /op/tenants/:id — full tenant detail for the SaaS operator. Shows brand
 * info, totals, the tenant's user list, and provides activate/deactivate +
 * delete controls.
 */
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

  if (isLoading || !tenant) {
    return (
      <div className="min-h-64 flex items-center justify-center text-muted-foreground text-sm">
        جارٍ التحميل...
      </div>
    )
  }

  const handleToggle = () => {
    const verb = tenant.is_active ? 'تعطيل' : 'تفعيل'
    if (confirm(`${verb} التاجر "${tenant.name}"؟`)) {
      toggleMutation.mutate()
    }
  }


  return (
    <div className="max-w-5xl">
      <BackButton href="/op/tenants" label="التجار" />

      <PageHeader
        icon={<Building2 />}
        title={tenant.name}
        subtitle={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="font-mono" dir="ltr">{tenant.subdomain}</span>
            {tenant.is_active ? (
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
            <span className="text-[10px] bg-muted text-foreground px-2 py-0.5 rounded-full">
              {tenant.plan}
            </span>
            {tenant.description && (
              <span className="block w-full mt-2 max-w-xl">{tenant.description}</span>
            )}
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleToggle}
              disabled={toggleMutation.isPending}
              className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground"
            >
              {toggleMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
              )}
              {tenant.is_active ? 'تعطيل' : 'تفعيل'}
            </Button>
            <DeleteButton
              variant="wide"
              label="حذف التاجر"
              title="حذف التاجر"
              description={
                <>
                  سيتم حذف التاجر <strong>{tenant.name}</strong> نهائياً، مع كل
                  البطاقات والعملاء والأختام التابعة له. هذا الإجراء لا يمكن
                  التراجع عنه.
                </>
              }
              confirmLabel="حذف التاجر"
              loading={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutateAsync()}
            />
          </div>
        }
      />

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatBox icon={<Users className="w-4 h-4" />} label="المستخدمون" value={tenant.stats.users} />
        <StatBox
          icon={<CreditCard className="w-4 h-4" />}
          label="قوالب البطاقات"
          value={tenant.stats.card_templates}
        />
        <StatBox icon={<Users className="w-4 h-4" />} label="العملاء" value={tenant.stats.customers} />
        <StatBox
          icon={<CreditCard className="w-4 h-4" />}
          label="بطاقات مُصدَرة"
          value={tenant.stats.issued_cards}
        />
        <StatBox icon={<Stamp className="w-4 h-4" />} label="إجمالي الأختام" value={tenant.stats.stamps_given} />
      </section>

      {/* Users */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">مستخدمو هذا التاجر</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {tenant.users.length} مستخدم
          </p>
        </div>
        {tenant.users.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">لا يوجد مستخدمون</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-start px-4 py-3 font-medium">الاسم</th>
                <th className="text-start px-4 py-3 font-medium">البريد</th>
                <th className="text-start px-4 py-3 font-medium">الدور</th>
                <th className="text-start px-4 py-3 font-medium">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {tenant.users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs" dir="ltr">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] bg-muted text-foreground px-2 py-0.5 rounded-full">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-blue-400">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  )
}
