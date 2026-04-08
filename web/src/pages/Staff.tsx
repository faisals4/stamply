import { useState } from 'react'
import { useLocation } from 'wouter'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaginatedQuery } from '@/lib/paginatedQuery'
import { useDebounce } from '@/lib/useDebounce'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingBlock } from '@/components/ui/spinner'
import {
  Users,
  Plus,
  UserCog,
  ShieldCheck,
  ScanLine,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DeleteButton } from '@/components/ui/delete-button'
import { EditButton } from '@/components/ui/edit-button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar-img'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  listStaff,
  deleteStaff,
  type StaffMember,
  type StaffRole,
} from '@/lib/staffApi'
import { StaffFormModal } from './staff/StaffFormModal'
import { TempPasswordDialog } from './staff/TempPasswordDialog'

/**
 * /admin/managers — the tenant's staff directory.
 * Lists admins, managers, and cashiers. "Add" opens a modal; "Edit" opens
 * a dedicated edit page at /admin/managers/:id.
 */
export default function StaffPage() {
  const { t } = useI18n()
  const { user, can } = useAuth()
  const [, setLocation] = useLocation()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'' | StaffRole>('')
  const [formOpen, setFormOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = usePaginatedQuery(
    ['staff', debouncedSearch, roleFilter],
    (p) =>
      listStaff({
        page: p,
        q: debouncedSearch || undefined,
        role: roleFilter || undefined,
      }),
    page,
  )
  const staff = data?.data ?? []
  const meta = data?.meta

  const deleteMutation = useMutation({
    mutationFn: deleteStaff,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      alert(axiosErr.response?.data?.message ?? 'تعذر الحذف')
    },
  })

  const openAdd = () => setFormOpen(true)

  const openEdit = (member: StaffMember) => {
    setLocation(`/admin/managers/${member.id}`)
  }

  return (
    <div>
      <PageHeader
        icon={<UserCog />}
        title={t('staff')}
        subtitle="إدارة مستخدمي لوحة التحكم (مدراء، مدراء فروع، كاشير) وربطهم بالفروع"
        action={
          <div className="flex items-center gap-2">
            {can('staff.permissions') && (
              <Button
                variant="outline"
                onClick={() => setLocation('/admin/managers/permissions')}
              >
                <Lock className="w-4 h-4 me-1.5" />
                الصلاحيات
              </Button>
            )}
            {can('staff.manage') && (
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4 me-1.5" />
                {t('addStaff')}
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="ابحث بالاسم أو البريد..."
          className="flex-1"
        />

        <div className="grid grid-cols-2 sm:flex gap-2">
          {(['', 'admin', 'manager', 'cashier'] as const).map((r) => (
            <button
              key={r || 'all'}
              type="button"
              onClick={() => {
                setRoleFilter(r)
                setPage(1)
              }}
              className={cn(
                'text-xs px-2 sm:px-3 py-2 rounded-md border transition whitespace-nowrap',
                roleFilter === r
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background border-border text-muted-foreground hover:border-ring',
              )}
            >
              {r === '' ? t('filterAll') : t(`role${r.charAt(0).toUpperCase() + r.slice(1)}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : staff.length === 0 ? (
          <EmptyState icon={Users} message={t('noData')} />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-start px-4 py-3 font-medium">{t('nameLabel')}</th>
                <th className="text-start px-4 py-3 font-medium">{t('email')}</th>
                <th className="text-start px-4 py-3 font-medium">{t('role')}</th>
                <th className="text-start px-4 py-3 font-medium">{t('branches')}</th>
                <th className="text-start px-4 py-3 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} email={s.email} size={36} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        {s.is_self && (
                          <div className="text-[10px] text-muted-foreground">أنت</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                    {s.email}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={s.role} />
                  </td>
                  <td className="px-4 py-3">
                    {s.locations.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {s.locations.map((l) => (
                          <Badge key={l.id} variant="secondary" className="text-[10px]">
                            {l.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {can('staff.manage') && (
                        <>
                          <EditButton
                            onClick={() => openEdit(s)}
                            label={t('edit')}
                          />

                          <DeleteButton
                            label={t('delete')}
                            title={t('deleteStaff')}
                            description={
                              <>
                                سيتم حذف المستخدم <strong>{s.name}</strong>{' '}
                                نهائياً. لن يتمكّن من تسجيل الدخول بعد ذلك.
                              </>
                            }
                            confirmLabel={t('delete')}
                            disabled={s.is_self || s.id === user?.id}
                            loading={
                              deleteMutation.isPending &&
                              deleteMutation.variables === s.id
                            }
                            onConfirm={() => deleteMutation.mutateAsync(s.id)}
                          />
                        </>
                      )}
                    </div>
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

      <StaffFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(pw) => {
          setFormOpen(false)
          setTempPassword(pw)
        }}
      />

      <TempPasswordDialog
        password={tempPassword}
        onClose={() => setTempPassword(null)}
      />
    </div>
  )
}

function RoleBadge({ role }: { role: StaffRole }) {
  const config: Record<StaffRole, { label: string; icon: typeof ShieldCheck; className: string }> = {
    admin: {
      label: 'مدير نظام',
      icon: ShieldCheck,
      className: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    },
    manager: {
      label: 'مدير فرع',
      icon: UserCog,
      className: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
    },
    cashier: {
      label: 'كاشير',
      icon: ScanLine,
      className: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    },
  }
  const { label, icon: Icon, className } = config[role] ?? config.admin
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border',
        className,
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}
