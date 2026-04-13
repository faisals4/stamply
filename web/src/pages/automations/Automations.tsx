import { useState } from 'react'
import { useLocation } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Workflow,
  Plus,
  Sparkles,
  UserPlus,
  Cake,
  Clock,
  Send,
  Pause,
  PlayCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingBlock } from '@/components/ui/spinner'
import { DeleteButton } from '@/components/ui/delete-button'
import {
  listAutomations,
  listPresets,
  createFromPreset,
  deleteAutomation,
  type Automation,
  type AutomationTrigger,
  type AutomationStatus,
} from '@/lib/api/automations'
import { cn } from '@/lib/utils'
import { useSubscriptionGuard } from '@/lib/subscription/useSubscriptionGuard'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { formatDate } from '@/lib/utils/date'

const TRIGGER_LABELS: Record<AutomationTrigger, { label: string; icon: typeof UserPlus; color: string }> = {
  card_issued: { label: 'عميل جديد', icon: UserPlus, color: 'text-violet-500' },
  birthday: { label: 'عيد ميلاد', icon: Cake, color: 'text-pink-500' },
  inactive: { label: 'غير نشط', icon: Clock, color: 'text-amber-500' },
  stamp_given: { label: 'عند الختم', icon: Send, color: 'text-emerald-500' },
}

const STATUS_LABELS: Record<AutomationStatus, { label: string; className: string; Icon: typeof FileText }> = {
  draft: { label: 'مسودة', className: 'bg-muted text-muted-foreground border', Icon: FileText },
  active: { label: 'نشطة', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border', Icon: PlayCircle },
  paused: { label: 'موقوفة', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 border', Icon: Pause },
}

export default function AutomationsPage() {
  const [, setLocation] = useLocation()
  const qc = useQueryClient()
  const guard = useSubscriptionGuard()
  const [triggerFilter, setTriggerFilter] = useState<'' | AutomationTrigger>('')
  const [showPresets, setShowPresets] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading } = usePaginatedQuery(
    ['automations', triggerFilter],
    (p) =>
      listAutomations({
        page: p,
        trigger_type: triggerFilter || undefined,
      }),
    page,
  )
  const automations = data?.data ?? []
  const meta = data?.meta

  const { data: presets = [] } = useQuery({
    queryKey: ['automations', 'presets'],
    queryFn: listPresets,
  })

  const fromPresetMutation = useMutation({
    mutationFn: createFromPreset,
    onSuccess: (auto) => {
      qc.invalidateQueries({ queryKey: ['automations'] })
      setLocation(`/admin/automations/${auto.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAutomation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  })

  return (
    <div>
      <PageHeader
        icon={<Workflow />}
        title="التفاعل والتنشيط"
        subtitle="أنشئ سيناريوهات تلقائية لإرسال رسائل ومنح أختام لعملائك بدون تدخل يدوي"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => guard.blocked ? alert(guard.message) : setShowPresets((v) => !v)}
              className={guard.blocked ? 'opacity-60' : ''}
            >
              <Sparkles className="w-4 h-4 me-1.5" />
              ابدأ من قالب
            </Button>
            <Button
              onClick={() => guard.blocked ? alert(guard.message) : setLocation('/admin/automations/new')}
              className={guard.blocked ? 'opacity-60' : ''}
            >
              <Plus className="w-4 h-4 me-1.5" />
              أتمتة جديدة
            </Button>
          </div>
        }
      />

      {/* Presets panel (collapsible) */}
      {showPresets && (
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              قوالب جاهزة
            </h3>
            <button
              type="button"
              onClick={() => setShowPresets(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              إخفاء
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {presets.map((p) => {
              const trig = TRIGGER_LABELS[p.trigger_type]
              const TrigIcon = trig.icon
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => guard.blocked ? alert(guard.message) : fromPresetMutation.mutate(p.key)}
                  disabled={fromPresetMutation.isPending || guard.blocked}
                  className="text-start p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrigIcon className={`w-4 h-4 ${trig.color}`} />
                    <span className="text-[10px] text-muted-foreground">{trig.label}</span>
                  </div>
                  <div className="font-semibold text-sm mb-1">{p.name}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{p.description}</div>
                  <div className="mt-2 text-[10px] text-primary">
                    {p.flow_json.steps.length} خطوة
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          type="button"
          onClick={() => {
            setTriggerFilter('')
            setPage(1)
          }}
          className={cn(
            'text-xs px-3 py-2 rounded-md border transition',
            triggerFilter === ''
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-background border-border text-muted-foreground hover:border-ring',
          )}
        >
          الكل
        </button>
        {(['card_issued', 'birthday', 'inactive'] as AutomationTrigger[]).map((t) => {
          const meta = TRIGGER_LABELS[t]
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTriggerFilter(t)
                setPage(1)
              }}
              className={cn(
                'text-xs px-3 py-2 rounded-md border transition',
                triggerFilter === t
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background border-border text-muted-foreground hover:border-ring',
              )}
            >
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : automations.length === 0 ? (
          <div className="p-12 text-center">
            <Workflow className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">لا توجد أتمتات بعد</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => guard.blocked ? alert(guard.message) : setShowPresets(true)} className={guard.blocked ? 'opacity-60' : ''}>
                <Sparkles className="w-4 h-4 me-1.5" />
                ابدأ من قالب
              </Button>
              <Button onClick={() => guard.blocked ? alert(guard.message) : setLocation('/admin/automations/new')} className={guard.blocked ? 'opacity-60' : ''}>
                <Plus className="w-4 h-4 me-1.5" />
                أنشئ من الصفر
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-start px-4 py-3 font-medium">الاسم</th>
                <th className="text-start px-4 py-3 font-medium">المشغّل</th>
                <th className="text-start px-4 py-3 font-medium">الحالة</th>
                <th className="text-start px-4 py-3 font-medium">عدد التشغيلات</th>
                <th className="text-start px-4 py-3 font-medium">آخر تشغيل</th>
                <th className="text-start px-4 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => {
                const trig = TRIGGER_LABELS[a.trigger_type]
                const TrigIcon = trig.icon
                const status = STATUS_LABELS[a.status]
                const StatusIcon = status.Icon
                return (
                  <tr
                    key={a.id}
                    onClick={() => guard.blocked ? alert(guard.message) : setLocation(`/admin/automations/${a.id}`)}
                    className="border-t border-border hover:bg-muted/30 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.name}</div>
                      {a.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-md">
                          {a.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 text-xs">
                        <TrigIcon className={`w-3.5 h-3.5 ${trig.color}`} />
                        {trig.label}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full', status.className)}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">{a.total_runs}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(a.last_run_at)}
                    </td>
                    <td className="px-4 py-3">
                      <DeleteButton
                        label="حذف الأتمتة"
                        title="حذف الأتمتة"
                        description={
                          <>
                            سيتم حذف الأتمتة <strong>{a.name}</strong> نهائياً.
                          </>
                        }
                        confirmLabel="حذف الأتمتة"
                        loading={
                          deleteMutation.isPending &&
                          deleteMutation.variables === a.id
                        }
                        disabled={guard.blocked}
                        onConfirm={() => {
                          if (guard.blocked) { alert(guard.message); return Promise.resolve() }
                          return deleteMutation.mutateAsync(a.id)
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
