import { useEffect, useState } from 'react'
import { useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Loader2,
  Save,
  ShieldCheck,
  UserCog,
  ScanLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPermissions, saveRolePermissions } from '@/lib/api/permissions'
import type { StaffRole } from '@/lib/api/staff'
import { BackButton } from '@/components/ui/back-button'

const ROLE_META: Record<
  StaffRole,
  { label: string; icon: typeof ShieldCheck; accent: string }
> = {
  admin: {
    label: 'مدير النظام',
    icon: ShieldCheck,
    accent: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  },
  manager: {
    label: 'مدير فرع',
    icon: UserCog,
    accent: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  },
  cashier: {
    label: 'كاشير',
    icon: ScanLine,
    accent: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  },
}

/** /admin/managers/permissions/:role — grouped checkbox editor for one role. */
export default function PermissionsEditPage() {
  const [, params] = useRoute('/admin/managers/permissions/:role')
  const role = params?.role as StaffRole | undefined
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
  })

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [savedOnce, setSavedOnce] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data || !role) return
    setSelected(new Set(data.roles[role] ?? []))
  }, [data, role])

  const mutation = useMutation({
    mutationFn: () => saveRolePermissions(role!, Array.from(selected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] })
      setSavedOnce(true)
      setTimeout(() => setSavedOnce(false), 3500)
    },
    onError: (err) => {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message ?? 'تعذر الحفظ')
      } else {
        setError('حدث خطأ غير متوقع')
      }
    },
  })

  if (!role || !(role in ROLE_META)) {
    return (
      <div className="text-sm text-muted-foreground">الدور غير موجود</div>
    )
  }

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleGroupAll = (keys: string[], selectAll: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => (selectAll ? next.add(k) : next.delete(k)))
      return next
    })
  }

  const meta = ROLE_META[role]
  const Icon = meta.icon

  return (
    <div className="max-w-3xl">
      <BackButton href="/admin/managers/permissions" label="الصلاحيات" />

      <header className="mb-6 flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center border ${meta.accent}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">صلاحيات {meta.label}</h1>
          <p className="text-muted-foreground text-sm">
            فعّل أو عطّل ما تريد أن يراه ويستخدمه هذا الدور
          </p>
        </div>
      </header>

      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {Object.entries(data.catalog).map(([groupKey, group]) => {
              const keys = Object.keys(group.permissions)
              const allSelected = keys.every((k) => selected.has(k))
              const someSelected = keys.some((k) => selected.has(k))
              return (
                <div
                  key={groupKey}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{group.label}</h3>
                    <button
                      type="button"
                      onClick={() => toggleGroupAll(keys, !allSelected)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {allSelected
                        ? 'تعطيل الكل'
                        : someSelected
                          ? 'تفعيل الكل'
                          : 'تفعيل الكل'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {keys.map((key) => (
                      <label
                        key={key}
                        className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggle(key)}
                          className="accent-primary w-4 h-4"
                        />
                        <span className="flex-1">{group.permissions[key]}</span>
                        <code className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                          {key}
                        </code>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {error && <p className="text-sm text-destructive mb-3">{error}</p>}

          <div className="flex items-center gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
              ) : (
                <Save className="w-4 h-4 me-1.5" />
              )}
              حفظ صلاحيات {meta.label}
            </Button>
            {savedOnce && <span className="text-xs text-emerald-600">تم الحفظ ✓</span>}
            <span className="flex-1 text-end text-xs text-muted-foreground">
              {selected.size} صلاحية مفعّلة
            </span>
          </div>
        </>
      )}
    </div>
  )
}
