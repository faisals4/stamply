import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { AxiosError } from 'axios'
import { Loader2, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/auth'
import { signup } from '@/lib/api/tenant'

/**
 * /signup — public self-serve merchant signup. Creates a fresh tenant + admin
 * user, then immediately logs the browser into /admin.
 */
export default function SignupPage() {
  const { login } = useAuth()
  const [, setLocation] = useLocation()

  const [brandName, setBrandName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate subdomain from brand name (slugify)
  const handleBrandChange = (v: string) => {
    setBrandName(v)
    // Only auto-fill subdomain if the user hasn't manually edited it yet
    if (!subdomainTouched) {
      const slug = v
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 20)
      setSubdomain(slug)
    }
  }
  const [subdomainTouched, setSubdomainTouched] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await signup({
        brand_name: brandName.trim(),
        subdomain: subdomain.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      })
      // Log the user in immediately and land them on /admin
      login(res.token, res.user)
      setLocation('/admin')
    } catch (err) {
      if (err instanceof AxiosError) {
        const errors = err.response?.data?.errors as Record<string, string[]> | undefined
        const firstField = errors ? Object.values(errors)[0] : undefined
        const msg =
          firstField?.[0] ??
          err.response?.data?.message ??
          'تعذر إنشاء الحساب — تحقق من البيانات'
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
      {/* Back-to-landing arrow */}
      <Link
        href="/"
        aria-label="العودة للموقع"
        title="العودة للموقع"
        className="absolute top-5 start-5 z-10 inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-ring transition"
      >
        <ArrowRight className="w-4 h-4" />
      </Link>

      {/* ─── Form column ─── */}
      <div className="flex items-center justify-center px-4 py-6 sm:py-10 order-1">
        <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-5 sm:mb-8">
          <Logo height={48} className="mb-4" />
          <p className="text-sm text-muted-foreground mt-1 text-center">
            أنشئ حساب نشاطك التجاري وابدأ بإصدار بطاقات الولاء خلال دقائق
          </p>
        </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="brand">اسم النشاط التجاري *</Label>
              <Input
                id="brand"
                required
                value={brandName}
                onChange={(e) => handleBrandChange(e.target.value)}
                placeholder="مقهى الواحة"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="subdomain">المُعرِّف (Subdomain) *</Label>
              <Input
                id="subdomain"
                required
                value={subdomain}
                onChange={(e) => {
                  const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20)
                  setSubdomain(clean)
                  setSubdomainTouched(true)
                }}
                maxLength={20}
                pattern="[a-z0-9-]+"
                placeholder="my-cafe"
                dir="ltr"
                className="mt-1.5 font-mono"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                سيُستخدم في رابط بطاقاتك: stamply.cards/c/<strong>{subdomain || '...'}</strong>
              </p>
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">بيانات المسؤول</h3>

              <div>
                <Label htmlFor="name">الاسم الكامل *</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9@._+-]/g, '').replace(/\s/g, ''))}
                  dir="ltr"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="password">كلمة المرور *</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="mt-1.5"
                  aria-describedby="password-hint"
                />
                <p id="password-hint" className="text-[11px] text-muted-foreground mt-1">
                  8 أحرف على الأقل
                </p>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                  جارٍ إنشاء الحساب...
                </>
              ) : (
                'إنشاء الحساب والبدء'
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            لديك حساب بالفعل؟{' '}
            <Link href="/admin/login" className="text-primary hover:underline font-medium">
              تسجيل الدخول
            </Link>
          </p>

          <p className="text-[11px] text-muted-foreground text-center mt-4">
            بإنشاء حساب، أنت توافق على الشروط والأحكام
          </p>
        </div>
      </div>

      {/* ─── Hero column ─── */}
      <div className="hidden lg:flex items-center justify-center order-2 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center px-10 max-w-xl">
          <img
            src="/signup-hero.png"
            alt=""
            className="w-full max-w-[560px]"
          />

          <div className="text-center mt-6">
            <h2 className="text-2xl font-bold mb-2 text-foreground">
              ابدأ نشاطك التجاري على ستامبلي
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              أنشئ حسابك مجاناً خلال دقائق وأصدر بطاقات ولاء رقمية لعملائك بدون الحاجة إلى تطبيق
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
