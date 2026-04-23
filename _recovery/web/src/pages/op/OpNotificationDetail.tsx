import { useRoute } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Megaphone,
  Sparkles,
  Building2,
} from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/date'
import {
  getOpNotification,
  type OpNotificationType,
} from '@/lib/api/op/notifications'
import { IOSNotificationPreview } from './notifications/IOSNotificationPreview'

/**
 * /op/notifications/:id
 *
 * Read-only detail view for a previously-sent broadcast. Follows the
 * standard /op detail-page header pattern used by OpTenantDetail,
 * OpCustomerDetail, OpSubscriptionDetail:
 *
 *   - BackButton at the top (links to the list page)
 *   - PageHeader with icon + title + subtitle
 *   - Content in a max-w-6xl wrapper
 *
 * The body layout is a two-column grid on lg+ screens so the iPhone
 * preview sits next to the summary — same split the composer uses,
 * keeping "what you sent" visually aligned with "what you composed."
 */

export default function OpNotificationDetailPage() {
  const [, params] = useRoute<{ id: string }>('/op/notifications/:id')
  const id = params?.id

  const { data, isLoading } = useQuery({
    queryKey: ['op-notification', id],
    queryFn: () => getOpNotification(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="max-w-6xl">
        <BackButton href="/op/notifications" label="الإشعارات" />
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          جارٍ التحميل...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-6xl">
        <BackButton href="/op/notifications" label="الإشعارات" />
        <div className="text-center py-16 text-muted-foreground">
          الإشعار غير موجود
        </div>
      </div>
    )
  }

  const n = data.notification

  return (
    <div className="max-w-6xl">
      <BackButton href="/op/notifications" label="الإشعارات" />

      <PageHeader
        icon={<Bell />}
        title={n.title}
        subtitle={
          <span className="flex items-center gap-3 flex-wrap">
            <TypeBadge type={n.type} />
            <span className="text-xs text-muted-foreground">
              {formatDate(n.sent_at ?? n.created_at)}
            </span>
            {n.tenant && (
              <span className="text-xs text-muted-foreground">
                · {n.tenant.name}
              </span>
            )}
          </span>
        }
      />

      {/* Two-column body — summary on the start side, iPhone preview
          on the end side. Mirrors the composer so switching between
          "Send" and "Detail" feels like the same screen. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
        {/* Summary column */}
        <div className="space-y-5">
          {/* Title + body card */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h2
              className="text-lg font-semibold leading-snug"
              dir="auto"
            >
              {n.title}
            </h2>
            <p
              className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed"
              dir="auto"
            >
              {n.body}
            </p>
          </div>

          {/* Delivery stats */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="مستهدفون" value={n.target_count} tone="neutral" />
            <Stat label="وصل" value={n.sent_count} tone="success" />
            <Stat label="فشل" value={n.failed_count} tone="danger" />
          </div>

          {/* Metadata: image + deep link */}
          {(n.image_url ||
            (n.data &&
              typeof n.data === 'object' &&
              'deep_link' in n.data)) && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              {n.image_url && (
                <div className="space-y-1.5">
                  <Label>الصورة</Label>
                  <img
                    src={n.image_url}
                    alt=""
                    className="max-h-40 rounded-lg border border-border"
                  />
                  <p className="text-xs text-muted-foreground break-all">
                    {n.image_url}
                  </p>
                </div>
              )}

              {n.data &&
              typeof n.data === 'object' &&
              'deep_link' in n.data &&
              typeof (n.data as Record<string, unknown>).deep_link ===
                'string' ? (
                <div className="space-y-1.5">
                  <Label>رابط عميق</Label>
                  <p className="text-xs text-muted-foreground break-all bg-muted/50 rounded-md px-3 py-2 font-mono">
                    {(n.data as Record<string, unknown>).deep_link as string}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Recipients table */}
          {data.recipients.length > 0 && (
            <div className="space-y-2">
              <Label>
                المستلمون{' '}
                {data.recipients_truncated && (
                  <span className="text-muted-foreground text-xs">
                    (أول 200)
                  </span>
                )}
              </Label>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        الحالة
                      </th>
                      <th className="text-start px-3 py-2 font-medium">
                        المنصّة
                      </th>
                      <th className="text-start px-3 py-2 font-medium">
                        التاريخ
                      </th>
                      <th className="text-start px-3 py-2 font-medium">
                        الخطأ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recipients.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">
                          {r.status === 'sent' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border text-[10px]">
                              وصل
                            </Badge>
                          ) : r.status === 'failed' ? (
                            <Badge className="bg-red-500/15 text-red-600 border-red-500/30 border text-[10px]">
                              فشل
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              {r.status}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.platform ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDate(r.sent_at ?? '')}
                        </td>
                        <td className="px-3 py-2 text-red-500 max-w-[200px] truncate">
                          {r.error_message ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* iOS preview — read-only snapshot of what was sent */}
        <IOSNotificationPreview
          title={n.title}
          body={n.body}
          imageUrl={n.image_url ?? ''}
          sticky={false}
        />
      </div>
    </div>
  )
}

// -----------------------------------------------------------------
// Local helpers
// -----------------------------------------------------------------

function TypeBadge({ type }: { type: OpNotificationType }) {
  if (type === 'broadcast') {
    return (
      <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 border text-[10px]">
        <Megaphone className="w-3 h-3 me-1" />
        إعلاني — عام
      </Badge>
    )
  }
  if (type === 'tenant_broadcast') {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 border text-[10px]">
        <Building2 className="w-3 h-3 me-1" />
        إعلاني — متجر
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border text-[10px]">
      <Sparkles className="w-3 h-3 me-1" />
      تلقائي
    </Badge>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'neutral' | 'success' | 'danger'
}) {
  const cls =
    tone === 'success'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      : tone === 'danger'
        ? 'bg-red-500/10 text-red-600 border-red-500/20'
        : 'bg-muted text-foreground border-border'
  return (
    <div className={`rounded-xl border p-3 text-center ${cls}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-bold mt-0.5">
        {value.toLocaleString('ar')}
      </div>
    </div>
  )
}
