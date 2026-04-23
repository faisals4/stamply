import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Logo } from '@/components/brand/Logo'

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [location] = useLocation()

  const isEmbed = (() => {
    if (typeof window === 'undefined') return false
    if (new URLSearchParams(window.location.search).has('embed')) {
      sessionStorage.setItem('stamply.embed', '1')
      return true
    }
    return sessionStorage.getItem('stamply.embed') === '1'
  })()

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

  if (isEmbed) {
    return (
      <div className="min-h-screen bg-gray-50/80">
        <main className="max-w-7xl mx-auto p-6">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-50/80 text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex sticky top-0 h-screen self-start shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-white/80 backdrop-blur border-b border-gray-200/50 flex items-center justify-between px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="w-10 h-10 -ms-1 inline-flex items-center justify-center rounded-lg text-[#635C70] hover:text-[#eb592e] hover:bg-[#eb592e]/10 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/admin" aria-label="ستامبلي">
            <Logo height={24} />
          </Link>
          <div className="w-10" />
        </header>

        {/* Main content */}
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
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
