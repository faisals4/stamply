import { useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck,
  UserCog,
  ScanLine,
  ChevronLeft,
  Lock,
} from 'lucide-react'
import { getPermissions } from '@/lib/permissionsApi'
import type { StaffRole } from '@/lib/staffApi'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'

/**
 * /admin/managers/permissions — index page showing the 3 roles.
 * Click any card → edit that role's permissions.
 */
export default function PermissionsPage() {
  const [, setLocation] = useLocation()

  const { data, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
  })

  const roleInfo: Record<
    StaffRole,
    { label: string; description: string; icon: typeof ShieldCheck; accent: string }
  > = {
    admin: {
      label: 'مدير النظام',
      description: 'صلاحيات كاملة على كل أقسام النظام',
      icon: ShieldCheck,
      accent: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    },
    manager: {
      label: 'مدير فرع',
      description: 'إدارة البطاقات والعملاء والرسائل بدون الإعدادات الحساسة',
      icon: UserCog,
      accent: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
    },
    cashier: {
      label: 'كاشير',
      description: 'فقط ماسح الكاشير (إعطاء الأختام وصرف المكافآت)',
      icon: ScanLine,
      accent: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    },
  }

  const totalPermissions = data
    ? Object.values(data.catalog).reduce(
        (acc, g) => acc + Object.keys(g.permissions).length,
        0,
      )
    : 0

  return (
    <div className="max-w-3xl">
      <BackButton href="/admin/managers" label="المستخدمون" />

      <PageHeader
        icon={<Lock />}
        title="الصلاحيات"
        subtitle="تحكّم في ما يستطيع كل دور الوصول إليه داخل لوحة التحكم"
      />

      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['admin', 'manager', 'cashier'] as const).map((role) => {
            const info = roleInfo[role]
            const Icon = info.icon
            const enabled = data.roles[role]?.length ?? 0
            return (
              <button
                key={role}
                type="button"
                onClick={() => setLocation(`/admin/managers/permissions/${role}`)}
                className="text-start rounded-xl border border-border bg-card p-5 hover:border-ring transition group"
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center border ${info.accent} mb-3`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{info.label}</h3>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {info.description}
                </p>
                <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                  <span>الصلاحيات المفعّلة</span>
                  <span className="font-mono font-semibold text-foreground">
                    {enabled} / {totalPermissions}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground leading-relaxed bg-muted/50 border border-border rounded-md px-4 py-3">
        ⚠️ الصلاحيات حالياً هي بيانات وصفية فقط — لم يتم ربطها بعد بقيود فعلية
        على مستوى الـ API. هذا يوفّر لك تعريف الصلاحيات الآن وسنفعّل التطبيق
        الفعلي في تحديث قادم.
      </p>
    </div>
  )
}
