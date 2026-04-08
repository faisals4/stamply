import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, Smartphone, Bell, Users, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getMessagesReach,
  type ReachChannel,
} from '@/lib/messagesApi'
import { ReachableCustomersDialog } from './ReachableCustomersDialog'

/**
 * Three clickable stat tiles showing how many customers the tenant
 * can reach on each channel (email / SMS / push). Clicking a tile
 * opens a dialog with the actual list of reachable customers.
 *
 * Used in three places: /admin (dashboard), /admin/messages, and
 * /admin/messages/new. The component owns its own data fetching
 * (React Query) so each mount refreshes independently — the query
 * result is cached for 60 seconds to avoid hammering the backend
 * when the merchant navigates between pages.
 */
export function ReachStatCards({
  className,
  dense = false,
}: {
  className?: string
  /** Compact variant for the MessageCompose page where vertical
   *  space is scarce. */
  dense?: boolean
}) {
  const [openChannel, setOpenChannel] = useState<ReachChannel | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['messages', 'reach'],
    queryFn: getMessagesReach,
    staleTime: 60_000,
  })

  return (
    <>
      <div className={cn('space-y-3', className)}>
        {!dense && (
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">مدى الوصول للحملات</h2>
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              {isLoading ? '...' : `${data?.total_customers ?? 0} عميل`}
            </span>
          </div>
        )}

        <div
          className={cn(
            'grid gap-3',
            dense
              ? 'grid-cols-2 md:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
          )}
        >
          {/* Wallet first — it's the highest-reach channel for most
              tenants once customers install the pass, so we lead
              with it to draw the merchant's eye to their biggest
              audience. */}
          <StatTile
            channel="wallet"
            label="Apple Wallet"
            icon={<Wallet className="w-4 h-4" />}
            count={data?.wallet.reachable}
            percentage={data?.wallet.percentage}
            isLoading={isLoading}
            color="indigo"
            dense={dense}
            onClick={() => setOpenChannel('wallet')}
          />
          <StatTile
            channel="push"
            label="تنبيهات المتصفّح"
            icon={<Bell className="w-4 h-4" />}
            count={data?.push.reachable}
            percentage={data?.push.percentage}
            isLoading={isLoading}
            color="amber"
            dense={dense}
            onClick={() => setOpenChannel('push')}
          />
          <StatTile
            channel="email"
            label="البريد"
            icon={<Mail className="w-4 h-4" />}
            count={data?.email.reachable}
            percentage={data?.email.percentage}
            isLoading={isLoading}
            color="blue"
            dense={dense}
            onClick={() => setOpenChannel('email')}
          />
          <StatTile
            channel="sms"
            label="الرسائل النصية"
            icon={<Smartphone className="w-4 h-4" />}
            count={data?.sms.reachable}
            percentage={data?.sms.percentage}
            isLoading={isLoading}
            color="emerald"
            dense={dense}
            onClick={() => setOpenChannel('sms')}
          />
        </div>
      </div>

      <ReachableCustomersDialog
        channel={openChannel}
        onClose={() => setOpenChannel(null)}
      />
    </>
  )
}

/* ────────────────────────────────────────────────────────────── */

type TileColor = 'amber' | 'blue' | 'emerald' | 'indigo'

function StatTile({
  label,
  icon,
  count,
  percentage,
  isLoading,
  color,
  dense,
  onClick,
}: {
  channel: ReachChannel
  label: string
  icon: React.ReactNode
  count: number | undefined
  percentage: number | undefined
  isLoading: boolean
  color: TileColor
  dense: boolean
  onClick: () => void
}) {
  // Each channel has a distinct accent so the eye can jump straight
  // to the one it cares about. Neutral bg + hover lift keeps the
  // tiles feeling clickable without being loud.
  const accentMap: Record<TileColor, string> = {
    amber: 'text-amber-600 bg-amber-500/10 group-hover:bg-amber-500/15',
    blue: 'text-blue-600 bg-blue-500/10 group-hover:bg-blue-500/15',
    emerald: 'text-emerald-600 bg-emerald-500/10 group-hover:bg-emerald-500/15',
    indigo: 'text-indigo-600 bg-indigo-500/10 group-hover:bg-indigo-500/15',
  }
  const pctColorMap: Record<TileColor, string> = {
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    emerald: 'text-emerald-700',
    indigo: 'text-indigo-700',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group rounded-xl border bg-card p-4 text-start transition hover:border-primary/40 hover:shadow-sm',
        dense && 'p-3',
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0 transition-colors',
            accentMap[color],
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold tabular-nums">
              {isLoading ? '—' : (count ?? 0)}
            </span>
            {!isLoading && percentage !== undefined && (
              <span className={cn('text-[10px] font-medium', pctColorMap[color])}>
                {percentage}%
              </span>
            )}
          </div>
        </div>
      </div>
      {!dense && (
        <div className="text-[10px] text-muted-foreground mt-2 group-hover:text-primary transition-colors">
          اضغط لعرض القائمة ←
        </div>
      )}
    </button>
  )
}
