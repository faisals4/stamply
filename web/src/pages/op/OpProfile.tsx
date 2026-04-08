import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Loader2,
  Save,
  KeyRound,
  ShieldCheck,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { useOpAuth } from '@/lib/auth/opAuth'
import {
  getOpProfile,
  updateOpProfile,
  changeOpPassword,
  opLogoutAllDevices,
} from '@/lib/api/op/profile'
import { BackButton } from '@/components/ui/back-button'

/**
 * /op/profile — self-service profile editor for the platform admin.
 * Mirrors the tenant profile page but themed for the dark OpShell.
 */
export default function OpProfilePage() {
  const { admin, login, token, logout } = useOpAuth()
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['op-profile'],
    queryFn: getOpProfile,
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
    mutationFn: () => updateOpProfile({ name, email }),
    onSuccess: (fresh) => {
      qc.invalidateQueries({ queryKey: ['op-profile'] })
      if (token && admin) {
        login(token, { ...admin, name: fresh.name, email: fresh.email })
      }
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3500)
    },
    onError: (err) => setProfileError(extractError(err) ?? 'تعذر الحفظ'),
  })

  const passwordMutation = useMutation({
    mutationFn: () =>
      changeOpPassword({
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
    mutationFn: opLogoutAllDevices,
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
    return (
      <div className="min-h-64 flex items-center justify-center text-muted-foreground text-sm">
        جارٍ التحميل...
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <BackButton href="/op" label="لوحة التحكم" />

      <PageHeader
        icon={<UserCircle />}
        title={profile.name}
        subtitle={
          <span className="flex items-center gap-3">
            <span dir="ltr">{profile.email}</span>
            <span className="inline-flex items-center gap-1 text-blue-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              {profile.role === 'super_admin' ? 'مدير النظام الأعلى' : profile.role}
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
          <Label htmlFor="op-profile-name" className="text-foreground">الاسم</Label>
          <Input
            id="op-profile-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 bg-muted border-border text-foreground"
          />
        </div>

        <div>
          <Label htmlFor="op-profile-email" className="text-foreground">البريد الإلكتروني</Label>
          <Input
            id="op-profile-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            className="mt-1.5 bg-muted border-border text-foreground"
          />
        </div>

        {profileError && <p className="text-sm text-red-400">{profileError}</p>}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Save className="w-4 h-4 me-1.5" />
            )}
            حفظ
          </Button>
          {profileSaved && <span className="text-xs text-emerald-400">تم الحفظ ✓</span>}
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
          <Label htmlFor="op-cur-pw" className="text-foreground">كلمة المرور الحالية</Label>
          <Input
            id="op-cur-pw"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            dir="ltr"
            className="mt-1.5 bg-muted border-border text-foreground"
          />
        </div>

        <div>
          <Label htmlFor="op-new-pw" className="text-foreground">كلمة المرور الجديدة</Label>
          <Input
            id="op-new-pw"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            dir="ltr"
            className="mt-1.5 bg-muted border-border text-foreground"
          />
        </div>

        <div>
          <Label htmlFor="op-confirm-pw" className="text-foreground">تأكيد كلمة المرور الجديدة</Label>
          <Input
            id="op-confirm-pw"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            dir="ltr"
            className="mt-1.5 bg-muted border-border text-foreground"
          />
        </div>

        {pwError && <p className="text-sm text-red-400">{pwError}</p>}

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            variant="outline"
            disabled={passwordMutation.isPending}
            className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground"
          >
            {passwordMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <KeyRound className="w-4 h-4 me-1.5" />
            )}
            تحديث كلمة المرور
          </Button>
          {pwSaved && <span className="text-xs text-emerald-400">تم التغيير ✓</span>}
        </div>
      </form>

      {/* Sessions */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <LogOut className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-muted-foreground">الأمان والجلسات</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          إنهاء كل الجلسات الأخرى يحفظ جلستك الحالية فقط ويُخرج بقية الأجهزة.
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
            className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground"
          >
            {logoutAllMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            )}
            تسجيل الخروج من كل الأجهزة
          </Button>
          <Button
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
