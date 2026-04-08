import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Logo } from '@/components/brand/Logo'

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [location] = useLocation()

  // Close the drawer whenever the route changes — a safety net in case a
  // descendant link doesn't go through Sidebar's onNavigate callback.
  useEffect(() => {
    setMobileOpen(false)
  }, [location])

  // Prevent body scroll while the mobile drawer is open.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [mobileOpen])

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar — sticky, always visible on lg+ */}
      <div className="hidden lg:flex sticky top-0 h-screen self-start shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar with hamburger — visible only on < lg */}
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-background/90 backdrop-blur border-b border-border flex items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="w-11 h-11 -ms-1 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/admin" aria-label="ستامبلي">
            <Logo height={24} />
          </Link>
          <div className="w-10" />
        </header>

        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto p-3 sm:p-6 md:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile drawer — fixed overlay, only when open */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* drawer panel — slides from the inline-end (right in RTL) */}
          <div className="absolute inset-y-0 start-0 w-60 max-w-[85%] shadow-xl animate-in slide-in-from-right duration-200">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
