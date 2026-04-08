import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n'
import { createStaff, type StaffRole } from '@/lib/api/staff'
import { listLocations } from '@/lib/api/locations'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (tempPassword: string) => void
}

/**
 * Add-user modal only. Editing a user happens on the dedicated
 * /admin/managers/:id page.
 */
export function StaffFormModal({ open, onOpenChange, onCreated }: Props) {
  const { t } = useI18n()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<StaffRole>('cashier')
  const [locationIds, setLocationIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setError(null)
    setName('')
    setEmail('')
    setPassword('')
    setRole('cashier')
    setLocationIds([])
  }, [open])

  const mutation = useMutation({
    mutationFn: () =>
      createStaff({
        name,
        email,
        password,
        role,
        location_ids: locationIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      onCreated(password)
    },
    onError: (err) => {
      if (err instanceof AxiosError) {
        const data = err.response?.data as
          | { message?: string; errors?: Record<string, string[]> }
          | undefined
        const firstErr = data?.errors
          ? Object.values(data.errors)[0]?.[0]
          : undefined
        setError(firstErr ?? data?.message ?? 'تعذر الحفظ')
      } else {
        setError('حدث خطأ غير متوقع')
      }
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  const toggleLocation = (id: number) => {
    setLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('addStaff')}</DialogTitle>
          <DialogDescription>
            أضف مستخدماً جديداً بكلمة مرور مؤقتة
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="staff-name">{t('nameLabel')}</Label>
            <Input
              id="staff-name"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="staff-email">{t('email')}</Label>
            <Input
              id="staff-email"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="staff-password">{t('password')}</Label>
            <Input
              id="staff-password"
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              placeholder="TempPass@1"
              className="mt-1.5 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              سيتم عرضها مرة واحدة بعد الإنشاء — شاركها مع المستخدم
            </p>
          </div>

          <div>
            <Label>{t('role')}</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {(['admin', 'manager', 'cashier'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`text-xs px-3 py-2 rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    role === r
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-background border-border hover:border-ring'
                  }`}
                >
                  {r === 'admin'
                    ? t('roleAdmin')
                    : r === 'manager'
                      ? t('roleManager')
                      : t('roleCashier')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>{t('branches')}</Label>
            {locations.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1.5">
                لم يتم إنشاء أي فرع بعد. يمكنك إضافة الفروع من صفحة المواقع.
              </p>
            ) : (
              <div className="mt-1.5 space-y-1.5 max-h-36 overflow-auto border border-border rounded-md p-2">
                {locations.map((l) => (
                  <label
                    key={l.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={locationIds.includes(l.id)}
                      onChange={() => toggleLocation(l.id)}
                      className="accent-primary"
                    />
                    <span>{l.name}</span>
                  </label>
                ))}
              </div>
            )}
            {role === 'cashier' && locationIds.length === 0 && (
              <p className="text-xs text-destructive mt-1">
                الكاشير يجب أن يكون مرتبطاً بفرع واحد على الأقل
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
              )}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
