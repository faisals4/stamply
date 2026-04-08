import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import {
  LayoutDashboard,
  Building2,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOpAuth } from '@/lib/opAuth'
import { Avatar } from '@/components/ui/avatar-img'
import { Logo } from '@/components/brand/Logo'

const navItems = [
  { href: '/op', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/op/tenants', icon: Building2, label: 'التجار' },
  { href: '/op/settings', icon: Settings, label: 'إعدادات المنصّة' },
]

function OpSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { admin, logout } = useOpAuth()
  const [location] = useLocation()

  return (
    <aside className="w-60 bg-card border-e flex flex-col h-full">
      <div className="h-16 flex items-center gap-2 px-5 border-b">
        <Logo height={26} />
        <div className="text-[10px] text-muted-foreground tracking-wider">OPERATOR</div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/op'
              ? location === '/op'
              : location === item.href || location.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="flex items-center gap-3 px-2 py-2">
          <Link
            href="/op/profile"
            onClick={onNavigate}
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-muted -mx-2 px-2 py-1 rounded transition"
            title="الملف الشخصي"
          >
            <Avatar
              name={admin?.name}
              email={admin?.email}
              size={32}
              className="bg-primary/10 text-primary"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{admin?.name}</div>
              <div className="text-[10px] text-muted-foreground truncate" dir="ltr">
                {admin?.email}
              </div>
            </div>
          </Link>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-foreground transition shrink-0"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export function OpShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [location] = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [mobileOpen])

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex sticky top-0 h-screen self-start shrink-0">
        <OpSidebar />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-background/90 backdrop-blur border-b flex items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="w-11 h-11 -ms-1 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Logo height={22} />
            <span className="text-[9px] text-muted-foreground tracking-wider">OPERATOR</span>
          </div>
          <div className="w-10" />
        </header>

        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto p-3 sm:p-6 md:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 start-0 w-60 max-w-[85%] shadow-xl animate-in slide-in-from-right duration-200">
            <OpSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
