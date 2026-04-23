import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { Loader2, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth/auth'
import { api } from '@/lib/api/client'

// Dev convenience pre-fill — only active in local Vite dev builds.
// Production bundles have import.meta.env.DEV === false, so the form
// ships empty and the "Dev admin" hint box is hidden.
const DEV_ADMIN = import.meta.env.DEV
  ? {
      email: (import.meta.env.VITE_DEV_ADMIN_EMAIL as string | undefined) ?? '',
      password: (import.meta.env.VITE_DEV_ADMIN_PASSWORD as string | undefined) ?? '',
    }
  : { email: '', password: '' }

export default function LoginPage() {
  const { t } = useI18n()
  const { login } = useAuth()
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState(DEV_ADMIN.email)
  const [password, setPassword] = useState(DEV_ADMIN.password)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post('/login', { email, password })
      login(data.token, data.user)
      setLocation('/admin')
    } catch (err) {
      if (err instanceof AxiosError) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.errors?.email?.[0] ||
          'تعذر الاتصال بالخادم'
        setError(msg)
      } else {
        setError('حدث خطأ غير متوقع')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background relative">
      {/* Back-to-landing arrow — fixed at top so it's reachable regardless
          of the 2-column layout order. */}
      <Link
        href="/"
        aria-label="العودة للموقع"
        title="العودة للموقع"
        className="absolute top-5 start-5 z-10 inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-ring transition"
      >
        <ArrowRight className="w-4 h-4" />
      </Link>

      {/* ─── Right side (RTL first column) — form ─── */}
      <div className="flex items-center justify-center px-4 py-10 order-1">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <Logo height={48} className="mb-4" />
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {t('tagline')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="password">{t('password')}</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="mt-1.5"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                  {t('signingIn')}
                </>
              ) : (
                t('signIn')
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            ليس لديك حساب؟{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              سجّل نشاطك التجاري مجاناً
            </Link>
          </p>

          {import.meta.env.DEV && DEV_ADMIN.email ? (
            <div className="mt-6 p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                مدير النظام (Dev)
              </p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                {DEV_ADMIN.email}
              </p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                {DEV_ADMIN.password}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── Left side — hero illustration (white background to keep it on-brand) ─── */}
      <div className="hidden lg:flex items-center justify-center order-2 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center px-10 max-w-xl">
          <img
            src="/login-hero.png"
            alt=""
            className="w-full max-w-[560px]"
          />

          <div className="text-center mt-6">
            <h2 className="text-2xl font-bold mb-2 text-foreground">
              ارفع معدل رجوع عملائك بسهولة
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              نظام بطاقات ولاء رقمية يحفّز العملاء على التكرار بشكل مستمر، مما
              ينعكس مباشرة على زيادة المبيعات واستقرار الإيرادات
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
