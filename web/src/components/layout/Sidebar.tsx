import { Link, useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  CreditCard,
  Users,
  MessageSquare,
  Workflow,
  MapPin,
  UserCog,
  Settings,
  ScanLine,
  LogOut,
  BarChart3,
  ExternalLink,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth/auth'
import { Avatar } from '@/components/ui/avatar-img'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Logo } from '@/components/brand/Logo'
import { getTenant } from '@/lib/api/tenant'

/**
 * Each nav entry declares the permission required to even SEE it. Items are
 * filtered by `useAuth().can(...)` so a cashier sees only Dashboard / Customers
 * / Scan, etc. Admins always pass.
 */
const navItems = [
  { href: '/admin', icon: LayoutDashboard, labelKey: 'dashboard' as const, requires: 'dashboard.view' },
  { href: '/admin/cards', icon: CreditCard, labelKey: 'cards' as const, requires: 'cards.view' },
  { href: '/admin/customers', icon: Users, labelKey: 'customers' as const, requires: 'customers.view' },
  { href: '/admin/scan', icon: ScanLine, labelKey: 'scan' as const, requires: 'scan.use' },
  { href: '/admin/messages', icon: MessageSquare, labelKey: 'messages' as const, requires: 'messages.send' },
  { href: '/admin/wallet/announce', icon: Wallet, labelKey: 'walletAnnounce' as const, requires: 'messages.send' },
  { href: '/admin/automations', icon: Workflow, labelKey: 'automations' as const, requires: 'automations.view' },
  { href: '/admin/locations', icon: MapPin, labelKey: 'locations' as const, requires: 'locations.view' },
  { href: '/admin/managers', icon: UserCog, labelKey: 'managers' as const, requires: 'staff.view' },
  { href: '/admin/reports', icon: BarChart3, labelKey: 'reports' as const, requires: 'reports.view' },
  { href: '/admin/settings', icon: Settings, labelKey: 'settings' as const, requires: 'settings.brand' },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const [location] = useLocation()
  const { t } = useI18n()
  const { user, logout, can } = useAuth()

  const visibleItems = navItems.filter((item) => can(item.requires))

  // Load the current tenant so the header can link to its public brand page
  // (`/c/{subdomain}`). Cached for 5 minutes — subdomain rarely changes.
  const { data: tenant } = useQuery({
    queryKey: ['tenant', 'self'],
    queryFn: getTenant,
    staleTime: 5 * 60_000,
  })

  return (
    <aside className="w-60 bg-sidebar border-e border-sidebar-border flex flex-col h-full">
      <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
        <Link href="/" aria-label={t('appName')} onClick={onNavigate}>
          <Logo height={28} />
        </Link>
        {tenant?.subdomain && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`/c/${tenant.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="فتح صفحة التاجر العامة"
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>صفحة البراند العامة</TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          // Longest-prefix match so nested routes (e.g. /admin/cards/new)
          // still highlight their top-level nav entry.
          const isActive =
            item.href === '/admin'
              ? location === '/admin'
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
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <Link
            href="/admin/profile"
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-sidebar-accent/30 -mx-2 px-2 py-1 rounded transition"
            title="الملف الشخصي"
          >
            <Avatar name={user?.name} email={user?.email} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </Link>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-foreground transition shrink-0"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
