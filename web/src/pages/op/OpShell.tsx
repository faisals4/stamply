import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Smartphone,
  CreditCard,
  Crown,
  LogOut,
  Menu,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOpAuth } from '@/lib/auth/opAuth'
import { Avatar } from '@/components/ui/avatar-img'
import { Logo } from '@/components/brand/Logo'

const navItems = [
  { href: '/op', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/op/tenants', icon: Building2, label: 'التجار' },
  { href: '/op/customers', icon: Users, label: 'العملاء' },
  { href: '/op/subscriptions', icon: CreditCard, label: 'الاشتراكات' },
  { href: '/op/plans', icon: Crown, label: 'الخطط' },
  { href: '/op/app-settings', icon: Smartphone, label: 'إعدادات التطبيق' },
  { href: '/op/settings', icon: Settings, label: 'إعدادات المنصّة' },
]

function OpSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { admin, logout } = useOpAuth()
  const [location] = useLocation()

  return (
    <aside className="w-52 bg-white flex flex-col h-full">
      {/* Logo — 64px height, 24px horizontal padding, subtle border */}
      <div className="h-16 flex items-center justify-center px-6 border-b border-gray-200/50">
        <Link href="/op" onClick={onNavigate}>
          <Logo height={30} />
        </Link>
      </div>

      {/* Navigation — matching Order.sa: 16px font, 20px icons, 40px item height, 4px gap */}
      <nav className="flex-1 py-3 px-3 space-y-1">
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
                'flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#8B52F6] text-white'
                  : 'text-[#635C70] hover:bg-[#8B52F6]/10 hover:text-[#8B52F6] group',
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-[#A4A1AA] group-hover:text-[#8B52F6]')} />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-violet-300 shrink-0" />
              )}
              {!isActive && item.href === '/op/subscriptions' && (
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-gray-200/50">
        <div className="flex items-center gap-2">
          <Link
            href="/op/profile"
            onClick={onNavigate}
            className="flex items-center gap-2.5 flex-1 min-w-0 hover:bg-violet-50 px-2 py-2 rounded-xl transition"
            title="الملف الشخصي"
          >
            <Avatar
              name={admin?.name}
              email={admin?.email}
              size={34}
              className="bg-violet-100 text-violet-600"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-800 truncate">{admin?.name}</div>
              <div className="text-[11px] text-[#9E98A8] truncate" dir="ltr">
                {admin?.email}
              </div>
            </div>
          </Link>
          <button
            onClick={logout}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#9E98A8] hover:text-red-500 hover:bg-red-50 transition shrink-0"
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
    <div className="min-h-screen flex bg-gray-50/80 text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex sticky top-0 h-screen self-start shrink-0">
        <OpSidebar />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar — 64px height matching Order.sa */}
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-white/80 backdrop-blur border-b border-gray-200/50 flex items-center justify-between px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="w-10 h-10 -ms-1 inline-flex items-center justify-center rounded-xl text-[#635C70] hover:text-violet-700 hover:bg-violet-50 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Logo height={24} />
          <div className="w-10" />
        </header>

        {/* Main content — 24px padding matching Order.sa */}
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto p-6">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 start-0 w-52 max-w-[85%] shadow-2xl animate-in slide-in-from-right duration-200">
            <OpSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
