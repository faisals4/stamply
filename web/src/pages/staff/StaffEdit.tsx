import { useEffect, useState, type FormEvent } from 'react'
import { useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Loader2, Save, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { sanitizePassword } from '@/lib/sanitize-password'
import { Avatar } from '@/components/ui/avatar-img'
import { useI18n } from '@/i18n'
import {
  getStaff,
  updateStaff,
  type StaffRole,
} from '@/lib/api/staff'
import { listLocations } from '@/lib/api/locations'
import { BackButton } from '@/components/ui/back-button'

/**
 * /admin/managers/:id — full edit page for a staff user.
 * Identity + role + branches on top, an optional "change password" block below.
 */
export default function StaffEditPage() {
  const { t } = useI18n()
  const [, params] = useRoute('/admin/managers/:id')
  const id = params?.id
  const qc = useQueryClient()

  const { data: staff, isLoading, isError, error: fetchError } = useQuery({
    queryKey: ['staff', 'detail', id],
    queryFn: () => getStaff(id!),
    enabled: !!id,
    // 404 is an expected terminal state — don't retry or the page
    // stays on "loading" for 30s while query-client runs its 3×
    // exponential back-off.
    retry: (failureCount, err) => {
      if (err instanceof AxiosError && err.response?.status === 404) return false
      return failureCount < 2
    },
  })

  // `listLocations()` returns a Paginated<Location> envelope
  // (`{ data: Location[], meta: {...} }`), NOT a bare array. The
  // previous code destructured with `data: locations = []`, so when
  // the query resolved `locations` became the envelope object and
  // `locations.map` crashed with "not a function" — wiping out the
  // whole page into a blank screen. Extract the inner array.
  const { data: locationsPage } = useQuery({
    queryKey: ['locations'],
    queryFn: () => listLocations(),
  })
  const locations = locationsPage?.data ?? []

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('cashier')
  const [locationIds, setLocationIds] = useState<number[]>([])
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savedOnce, setSavedOnce] = useState(false)

  useEffect(() => {
    if (!staff) return
    setName(staff.name)
    setEmail(staff.email)
    setRole(staff.role)
    setLocationIds(staff.locations.map((l) => l.id))
  }, [staff])

  const profileMutation = useMutation({
    mutationFn: () =>
      updateStaff(Number(id), {
        name,
        email,
        role,
        location_ids: locationIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      qc.invalidateQueries({ queryKey: ['staff', 'detail', id] })
      setSavedOnce(true)
      setTimeout(() => setSavedOnce(false), 3500)
    },
    onError: (err) => setError(extractError(err) ?? 'تعذر الحفظ'),
  })

  const passwordMutation = useMutation({
    mutationFn: () =>
      updateStaff(Number(id), {
        name,
        email,
        role,
        location_ids: locationIds,
        password: newPassword,
      }),
    onSuccess: () => {
      setNewPassword('')
      qc.invalidateQueries({ queryKey: ['staff'] })
      alert('تم تحديث كلمة المرور بنجاح')
    },
    onError: (err) => setError(extractError(err) ?? 'تعذر تحديث كلمة المرور'),
  })

  const toggleLocation = (lid: number) => {
    setLocationIds((prev) =>
      prev.includes(lid) ? prev.filter((x) => x !== lid) : [...prev, lid],
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    profileMutation.mutate()
  }

  const onPasswordSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    passwordMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <BackButton href="/admin/managers" label={t('staff')} />
        <div className="min-h-64 flex items-center justify-center text-muted-foreground text-sm">
          {t('loading')}
        </div>
      </div>
    )
  }

  // Fetch completed — either 404 or unexpected error. Previously the
  // component returned the loading view forever because `!staff` was
  // grouped with `isLoading`, which hid the real state from the user.
  if (isError || !staff) {
    const notFound =
      fetchError instanceof AxiosError &&
      fetchError.response?.status === 404
    return (
      <div className="max-w-3xl">
        <BackButton href="/admin/managers" label={t('staff')} />
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold mb-2">
            {notFound ? 'المستخدم غير موجود' : 'تعذر تحميل بيانات المستخدم'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {notFound
              ? 'ربما تم حذفه أو أن الرابط غير صحيح.'
              : 'حاول تحديث الصفحة. لو استمرت المشكلة تواصل مع الدعم.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <BackButton href="/admin/managers" label={t('staff')} />

      <header className="mb-6 flex items-center gap-3">
        <Avatar name={staff.name} email={staff.email} size={48} />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('editStaff')}</h1>
          <p className="text-muted-foreground text-sm" dir="ltr">
            {staff.email}
          </p>
        </div>
      </header>

      {/* Profile block */}
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-border bg-card p-5 space-y-4 mb-6"
      >
        <h2 className="font-semibold text-sm text-muted-foreground mb-1">
          البيانات الأساسية
        </h2>

        <div>
          <Label htmlFor="edit-name">{t('nameLabel')}</Label>
          <Input
            id="edit-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="edit-email">{t('email')}</Label>
          <Input
            id="edit-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>{t('role')}</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {(['admin', 'manager', 'cashier'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                disabled={staff.is_self}
                className={`text-xs px-3 py-2 rounded-md border transition disabled:opacity-50 disabled:cursor-not-allowed ${
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
          {staff.is_self && (
            <p className="text-[11px] text-muted-foreground mt-1">
              لا يمكنك تغيير دورك بنفسك
            </p>
          )}
        </div>

        <div>
          <Label>{t('branches')}</Label>
          {locations.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-1.5">
              لم يتم إنشاء أي فرع بعد.
            </p>
          ) : (
            <div className="mt-1.5 space-y-1.5 border border-border rounded-md p-2 max-h-40 overflow-auto">
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

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            )}
            <Save className="w-4 h-4 me-1.5" />
            {t('save')}
          </Button>
          {savedOnce && (
            <span className="text-xs text-emerald-600">تم الحفظ ✓</span>
          )}
        </div>
      </form>

      {/* Password block */}
      <form
        onSubmit={onPasswordSubmit}
        className="rounded-xl border border-border bg-card p-5 space-y-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-muted-foreground">
            تغيير كلمة المرور
          </h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          اكتب كلمة مرور جديدة فقط إذا كنت تريد تغييرها. اتركها فارغة للإبقاء على
          القديمة.
        </p>

        <div>
          <Label htmlFor="edit-password">كلمة المرور الجديدة</Label>
          {/* Staff password is intentionally `type="text"` here so an
              admin assigning a new password can read it while they
              type and copy it to the employee. We still sanitize
              Arabic + whitespace inline — same ban-list as the
              PasswordInput component, just without the show/hide toggle. */}
          <Input
            id="edit-password"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(sanitizePassword(e.target.value))}
            dir="ltr"
            placeholder="8 أحرف على الأقل"
            className="mt-1.5 font-mono"
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          variant="outline"
          disabled={passwordMutation.isPending || newPassword.length === 0}
        >
          {passwordMutation.isPending && (
            <Loader2 className="w-4 h-4 animate-spin me-1.5" />
          )}
          <KeyRound className="w-4 h-4 me-1.5" />
          تحديث كلمة المرور
        </Button>
      </form>

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}
    </div>
  )
}

function extractError(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined
    const firstErr = data?.errors
      ? Object.values(data.errors)[0]?.[0]
      : undefined
    return firstErr ?? data?.message
  }
  return undefined
}
