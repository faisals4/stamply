import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/Logo'
import { useAuth } from '@/lib/auth/auth'

/**
 * Standalone layout for the public help center — NO AppShell, no
 * sidebar, no auth requirement. Header mirrors the marketing Landing
 * page nav 1:1 so a user moving between `/` and `/help` sees the same
 * branding, same container width, same button variants and same
 * "ابدأ مجاناً" CTA. Nav anchors point back at Landing sections
 * (e.g. `/#features`) so they work from any page.
 */
export function HelpLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ─── Sticky header (mirrors LandingPage <Nav />) ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo height={32} />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/#features" className="hover:text-foreground transition">المزايا</a>
            <a href="/#how-it-works" className="hover:text-foreground transition">كيف يعمل</a>
            <a href="/#pricing" className="hover:text-foreground transition">الأسعار</a>
            <a href="/#contact" className="hover:text-foreground transition">تواصل</a>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/admin">
                <Button className="group">
                  لوحة التحكم
                  <ArrowLeft className="w-4 h-4 ms-1.5 transition-transform duration-300 group-hover:-translate-x-1" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/admin/login">
                  <Button variant="ghost" className="hidden sm:inline-flex">
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="group">
                    ابدأ مجاناً
                    <ArrowLeft className="w-4 h-4 ms-1.5 transition-transform duration-300 group-hover:-translate-x-1" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-5 py-8">
        {children}
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 bg-white py-8 mt-auto">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <Logo className="h-5 mx-auto mb-3 opacity-40" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Stamply — بطاقات ولاء رقمية بدون تطبيق
          </p>
        </div>
      </footer>
    </div>
  )
}
