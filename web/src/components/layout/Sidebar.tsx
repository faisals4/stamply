import { Link, useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  CreditCard,
  Crown,
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
  { href: '/admin/subscription', icon: Crown, labelKey: 'subscription' as const, requires: null },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const [location] = useLocation()
  const { t } = useI18n()
  const { user, logout, can } = useAuth()

  const visibleItems = navItems.filter((item) => item.requires === null || can(item.requires))

  const { data: tenant } = useQuery({
    queryKey: ['tenant', 'self'],
    queryFn: getTenant,
    staleTime: 5 * 60_000,
  })

  return (
    <aside className="w-52 bg-white flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200/50">
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
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#A4A1AA] hover:text-[#eb592e] hover:bg-[#eb592e]/10 transition"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>صفحة البراند العامة</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Subscription badge */}
      {(() => {
        const sub = (user as Record<string, unknown>)?.subscription as {
          plan: string; status: string; days_remaining: number; is_trial: boolean; plan_name_ar: string
        } | null | undefined
        if (!sub || sub.status === 'active') return null

        const badgeConfig: Record<string, { bg: string; text: string; label: string }> = {
          trial: { bg: 'bg-amber-500/15', text: 'text-amber-600', label: `تجريبي — باقي ${sub.days_remaining} يوم من 14` },
          expiring_soon: { bg: 'bg-orange-500/15', text: 'text-orange-600', label: `ينتهي خلال ${sub.days_remaining} يوم` },
          expired: { bg: 'bg-red-500/15', text: 'text-red-600', label: 'منتهي' },
          disabled: { bg: 'bg-neutral-500/15', text: 'text-neutral-500', label: 'معطّل' },
        }
        const cfg = badgeConfig[sub.status] ?? badgeConfig.trial
        return (
          <Link href="/admin/subscription" onClick={onNavigate}>
            <div className={cn('mx-3 mt-3 px-3 py-2 rounded-lg text-xs font-medium text-center cursor-pointer hover:opacity-80 transition', cfg.bg, cfg.text)}>
              {cfg.label}
            </div>
          </Link>
        )
      })()}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-1">
        {visibleItems.map((item) => {
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
                'flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#eb592e] text-white'
                  : 'text-[#635C70] hover:bg-[#eb592e]/10 hover:text-[#eb592e] group',
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-[#A4A1AA] group-hover:text-[#eb592e]')} />
              <span className="flex-1">{t(item.labelKey)}</span>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-violet-300 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-gray-200/50">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/profile"
            onClick={onNavigate}
            className="flex items-center gap-2.5 flex-1 min-w-0 hover:bg-[#eb592e]/5 px-2 py-2 rounded-lg transition"
            title="الملف الشخصي"
          >
            <Avatar
              name={user?.name}
              email={user?.email}
              size={34}
              className="bg-violet-100 text-violet-600"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-800 truncate">{user?.name}</div>
              <div className="text-[11px] text-[#9E98A8] truncate">{user?.email}</div>
            </div>
          </Link>
          <button
            onClick={logout}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#9E98A8] hover:text-red-500 hover:bg-red-50 transition shrink-0"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
