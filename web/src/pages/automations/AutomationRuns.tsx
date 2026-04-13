import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, Loader2, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAutomationRuns, type AutomationRun } from '@/lib/api/automations'
import { Pagination } from '@/components/ui/pagination'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { formatDateTime } from '@/lib/utils/date'

const STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'completed', label: 'اكتمل' },
  { value: 'waiting', label: 'انتظار' },
  { value: 'running', label: 'قيد التنفيذ' },
  { value: 'failed', label: 'فشل' },
]

/**
 * Shows the runs of an automation with each run's step log, paginated
 * server-side + filterable by status and date range.
 */
export function AutomationRuns({ automationId }: { automationId: number }) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading } = usePaginatedQuery(
    ['automations', 'runs', automationId, status, from, to],
    (p) =>
      getAutomationRuns(automationId, {
        page: p,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    page,
  )
  const runs = data?.data ?? []
  const meta = data?.meta

  return (
    <div>
      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">الحالة</Label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">من تاريخ</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
            className="mt-1 h-9"
            dir="ltr"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
            className="mt-1 h-9"
            dir="ltr"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">جارٍ التحميل...</div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">لم تُشغَّل هذه الأتمتة بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  )
}

function RunCard({ run }: { run: AutomationRun }) {
  const status = STATUS_META[run.status] ?? STATUS_META.completed
  const StatusIcon = status.Icon

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full', status.className)}>
            <StatusIcon className="w-2.5 h-2.5" />
            {status.label}
          </span>
          <div className="text-sm">
            {run.customer ? (
              <>
                <span className="font-medium">{run.customer.name}</span>
                <span className="text-muted-foreground text-xs font-mono" dir="ltr">
                  {' '}• {run.customer.phone}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">عميل محذوف</span>
            )}
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {formatDateTime(run.started_at, '')}
        </div>
      </div>

      {run.logs.length > 0 && (
        <ul className="px-4 py-3 space-y-1.5">
          {run.logs.map((log, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">
                {log.step_index + 1}
              </span>
              <LogResultIcon result={log.result} />
              <span className="flex-1 text-muted-foreground">{log.action}</span>
              {log.error_message && (
                <span className="text-destructive text-[10px]">{log.error_message}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {run.error_message && (
        <div className="px-4 py-2 text-xs text-destructive border-t border-border bg-destructive/5">
          ⚠ {run.error_message}
        </div>
      )}
    </div>
  )
}

function LogResultIcon({ result }: { result: 'success' | 'skipped' | 'failed' }) {
  if (result === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
  if (result === 'failed') return <XCircle className="w-3.5 h-3.5 text-destructive" />
  return <Ban className="w-3.5 h-3.5 text-muted-foreground" />
}

const STATUS_META = {
  queued: { label: 'في الانتظار', className: 'bg-muted text-muted-foreground border', Icon: Clock },
  running: { label: 'قيد التنفيذ', className: 'bg-violet-500/15 text-violet-600 border-violet-500/30 border', Icon: Loader2 },
  waiting: { label: 'انتظار', className: 'bg-purple-500/15 text-purple-600 border-purple-500/30 border', Icon: Clock },
  completed: { label: 'اكتمل', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border', Icon: CheckCircle2 },
  failed: { label: 'فشل', className: 'bg-destructive/15 text-destructive border-destructive/30 border', Icon: XCircle },
  cancelled: { label: 'ملغى', className: 'bg-muted text-muted-foreground border', Icon: Ban },
} as const
