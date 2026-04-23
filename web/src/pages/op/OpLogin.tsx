import { useState, type FormEvent } from 'react'
import { useLocation } from 'wouter'
import { Loader2 } from 'lucide-react'
import { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/brand/Logo'
import { useOpAuth } from '@/lib/auth/opAuth'
import { opLogin } from '@/lib/api/op'

// Dev convenience pre-fill — only active in local Vite dev builds.
// Production bundles have import.meta.env.DEV === false, so the form
// ships empty and the hint box is hidden.
const DEV_OP = import.meta.env.DEV
  ? {
      email: (import.meta.env.VITE_DEV_OP_EMAIL as string | undefined) ?? '',
      password: (import.meta.env.VITE_DEV_OP_PASSWORD as string | undefined) ?? '',
    }
  : { email: '', password: '' }

/**
 * /op/login — SaaS operator login. Separate from /admin/login; only
 * platform_admins can authenticate here.
 */
export default function OpLoginPage() {
  const { login } = useOpAuth()
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState(DEV_OP.email)
  const [password, setPassword] = useState(DEV_OP.password)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await opLogin(email, password)
      login(res.token, res.admin)
      setLocation('/op')
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo height={48} className="mb-4" />
          <p className="text-sm text-muted-foreground mt-1 text-center">
            لوحة التشغيل — دخول خاص بفريق تشغيل المنصة
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="op-email" className="text-foreground">
                البريد الإلكتروني
              </Label>
              <Input
                id="op-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="mt-1.5 bg-muted border-border text-foreground"
              />
            </div>

            <div>
              <Label htmlFor="op-password" className="text-foreground">
                كلمة المرور
              </Label>
              <PasswordInput
                id="op-password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="mt-1.5 bg-muted border-border text-foreground"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8B52F6] hover:bg-[#8B52F6]/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                  جارٍ الدخول...
                </>
              ) : (
                'دخول'
              )}
            </Button>
          </form>

          {import.meta.env.DEV && DEV_OP.email ? (
            <div className="mt-5 p-3 rounded-md bg-muted/50 border">
              <p className="text-[11px] text-muted-foreground mb-1 font-medium">
                مدير المنصة (Dev)
              </p>
              <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                {DEV_OP.email}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                {DEV_OP.password}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
