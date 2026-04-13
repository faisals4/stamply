import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { FullPageLoader } from '@/components/ui/spinner'
import {
  Loader2,
  Save,
  KeyRound,
  ShieldCheck,
  UserCog,
  ScanLine,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/lib/auth/auth'
import {
  getProfile,
  updateProfile,
  changePassword,
  logoutAllDevices,
} from '@/lib/api/profile'

const ROLE_LABEL: Record<string, { label: string; icon: typeof ShieldCheck; color: string }> = {
  admin: { label: 'مدير النظام', icon: ShieldCheck, color: 'text-violet-600' },
  manager: { label: 'مدير فرع', icon: UserCog, color: 'text-purple-600' },
  cashier: { label: 'كاشير', icon: ScanLine, color: 'text-amber-600' },
}

/**
 * /admin/profile — self-service profile management for the current user.
 * Available to anyone authenticated (admin / manager / cashier alike).
 */
export default function ProfilePage() {
  const { user, login, token, logout } = useAuth()
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setEmail(profile.email)
  }, [profile])

  const profileMutation = useMutation({
    mutationFn: () => updateProfile({ name, email }),
    onSuccess: (fresh) => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      // Refresh the cached auth user so the sidebar updates immediately.
      if (token && user) {
        login(token, { ...user, name: fresh.name, email: fresh.email })
      }
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3500)
    },
    onError: (err) => setProfileError(extractError(err) ?? 'تعذر الحفظ'),
  })

  const passwordMutation = useMutation({
    mutationFn: () =>
      changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 2500)
    },
    onError: (err) => setPwError(extractError(err) ?? 'تعذر تغيير كلمة المرور'),
  })

  const logoutAllMutation = useMutation({
    mutationFn: logoutAllDevices,
    onSuccess: ({ revoked }) => {
      alert(`تم إنهاء ${revoked} جلسة من الأجهزة الأخرى`)
    },
    onError: () => alert('تعذر إنهاء الجلسات'),
  })

  const onProfileSubmit = (e: FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    profileMutation.mutate()
  }

  const onPasswordSubmit = (e: FormEvent) => {
    e.preventDefault()
    setPwError(null)
    if (newPassword !== confirmPassword) {
      setPwError('كلمة المرور الجديدة وتأكيدها غير متطابقتين')
      return
    }
    if (newPassword.length < 8) {
      setPwError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    passwordMutation.mutate()
  }

  if (isLoading || !profile) {
    return <FullPageLoader />
  }

  const roleInfo = ROLE_LABEL[profile.role] ?? ROLE_LABEL.admin
  const RoleIcon = roleInfo.icon

  return (
    <div className="max-w-3xl">
      <PageHeader
        icon={<UserCircle />}
        title={profile.name}
        subtitle={
          <span className="flex items-center gap-3">
            <span dir="ltr">{profile.email}</span>
            <span className="inline-flex items-center gap-1">
              <RoleIcon className={`w-3.5 h-3.5 ${roleInfo.color}`} />
              <span className={roleInfo.color}>{roleInfo.label}</span>
            </span>
          </span>
        }
      />

      {/* Identity */}
      <form
        onSubmit={onProfileSubmit}
        className="rounded-xl border border-border bg-card p-5 space-y-4 mb-6"
      >
        <h2 className="font-semibold text-sm text-muted-foreground">المعلومات الأساسية</h2>

        <div>
          <Label htmlFor="profile-name">الاسم</Label>
          <Input
            id="profile-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="profile-email">البريد الإلكتروني</Label>
          <Input
            id="profile-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            className="mt-1.5"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            يُستخدم لتسجيل الدخول، وكذلك لجلب صورتك الشخصية من Gravatar تلقائياً.
          </p>
        </div>

        {profileError && <p className="text-sm text-destructive">{profileError}</p>}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Save className="w-4 h-4 me-1.5" />
            )}
            حفظ
          </Button>
          {profileSaved && <span className="text-xs text-emerald-600">تم الحفظ ✓</span>}
        </div>
      </form>

      {/* Password */}
      <form
        onSubmit={onPasswordSubmit}
        className="rounded-xl border border-border bg-card p-5 space-y-4 mb-6"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-muted-foreground">تغيير كلمة المرور</h2>
        </div>

        <div>
          <Label htmlFor="cur-pw">كلمة المرور الحالية</Label>
          <PasswordInput
            id="cur-pw"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            dir="ltr"
            autoComplete="current-password"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="new-pw">كلمة المرور الجديدة</Label>
          <PasswordInput
            id="new-pw"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            dir="ltr"
            autoComplete="new-password"
            className="mt-1.5"
            aria-describedby="new-pw-hint"
          />
          <p id="new-pw-hint" className="text-[11px] text-muted-foreground mt-1">
            8 أحرف على الأقل
          </p>
        </div>

        <div>
          <Label htmlFor="confirm-pw">تأكيد كلمة المرور الجديدة</Label>
          <PasswordInput
            id="confirm-pw"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            dir="ltr"
            autoComplete="new-password"
            className="mt-1.5"
          />
        </div>

        {pwError && <p className="text-sm text-destructive">{pwError}</p>}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant="outline" disabled={passwordMutation.isPending}>
            {passwordMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <KeyRound className="w-4 h-4 me-1.5" />
            )}
            تحديث كلمة المرور
          </Button>
          {pwSaved && <span className="text-xs text-emerald-600">تم التغيير ✓</span>}
        </div>
      </form>

      {/* Security / sessions */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <LogOut className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-muted-foreground">الأمان والجلسات</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          إذا فقدت جهازاً أو اشتبهت في وصول غير مصرح به، يمكنك إنهاء كل
          الجلسات الأخرى. سيتم إبقاء جلستك الحالية فقط.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            onClick={() => {
              if (confirm('سيتم إنهاء كل جلسات الدخول الأخرى. هل أنت متأكد؟')) {
                logoutAllMutation.mutate()
              }
            }}
            disabled={logoutAllMutation.isPending}
          >
            {logoutAllMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            )}
            تسجيل الخروج من كل الأجهزة
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={logout}
          >
            تسجيل خروج من هذا الجهاز
          </Button>
        </div>
      </div>
    </div>
  )
}

function extractError(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined
    const firstErr = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
    return firstErr ?? data?.message
  }
  return undefined
}
