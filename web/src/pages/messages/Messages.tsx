import { useState } from 'react'
import { useLocation } from 'wouter'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare,
  Plus,
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Bell,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingBlock } from '@/components/ui/spinner'
import { DeleteButton } from '@/components/ui/delete-button'
import { ReachStatCards } from '@/components/messaging/ReachStatCards'
import {
  listMessages,
  deleteMessage,
  type BroadcastMessage,
} from '@/lib/api/messages'
import { cn } from '@/lib/utils'
import { useSubscriptionGuard } from '@/lib/subscription/useSubscriptionGuard'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { formatDate } from '@/lib/utils/date'

/**
 * /admin/messages — list of all broadcasts (sent + drafts) with quick stats.
 */
export default function MessagesPage() {
  const [, setLocation] = useLocation()
  const qc = useQueryClient()
  const guard = useSubscriptionGuard()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = usePaginatedQuery(
    ['messages', debouncedSearch],
    (p) => listMessages({ page: p, q: debouncedSearch || undefined }),
    page,
  )

  const messages = data?.data ?? []
  const meta = data?.meta

  // Delete a draft broadcast. The backend enforces draft-only deletes
  // so we never need to roll back on failure.
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMessage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  return (
    <div>
      <PageHeader
        icon={<MessageSquare />}
        title="الرسائل"
        subtitle="أرسل دفعات بريد إلكتروني أو SMS لعملائك"
        action={
          <Button
            onClick={() => guard.blocked ? alert(guard.message) : setLocation('/admin/messages/new')}
            className={guard.blocked ? 'opacity-60' : ''}
          >
            <Plus className="w-4 h-4 me-1.5" />
            رسالة جديدة
          </Button>
        }
      />

      {/* Reach stats — three clickable tiles showing how many
          customers can be reached on each channel. Clicking a tile
          opens a modal listing the actual reachable customers. */}
      <ReachStatCards className="mb-5" />

      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="ابحث في العنوان أو النص..."
        className="mb-4"
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            message="لم ترسل أي رسالة بعد"
            action={
              <Button onClick={() => setLocation('/admin/messages/new')}>
                <Plus className="w-4 h-4 me-1.5" />
                إنشاء أول رسالة
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-start px-4 py-3 font-medium">القناة</th>
                <th className="text-start px-4 py-3 font-medium">العنوان / المحتوى</th>
                <th className="text-start px-4 py-3 font-medium">الحالة</th>
                <th className="text-start px-4 py-3 font-medium">المرسل إليهم</th>
                <th className="text-start px-4 py-3 font-medium">التاريخ</th>
                <th className="w-1 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => {
                const isDraft = m.status === 'draft'
                const isDeletingThis =
                  deleteMutation.isPending && deleteMutation.variables === m.id
                return (
                  <tr
                    key={m.id}
                    onClick={() => setLocation(`/admin/messages/${m.id}`)}
                    className="border-t border-border hover:bg-muted/30 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <ChannelBadge channel={m.channel} />
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <div className="font-medium truncate">
                        {m.subject ?? m.body.slice(0, 60)}
                      </div>
                      {m.subject && (
                        <div className="text-xs text-muted-foreground truncate">
                          {m.body.slice(0, 80)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.status === 'sent' ? (
                        <span>
                          <span className="text-emerald-600 font-medium">{m.sent_count}</span>
                          {m.failed_count > 0 && (
                            <span className="text-destructive"> / {m.failed_count} فشل</span>
                          )}
                        </span>
                      ) : (
                        <span>{m.recipients_count}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(m.sent_at ?? m.created_at)}
                    </td>
                    <td className="px-2 py-3 text-end">
                      {/* Only drafts can be deleted — keeping the sent
                          history immutable is a hard backend rule. */}
                      {isDraft && (
                        <DeleteButton
                          label="حذف المسودة"
                          title="حذف المسودة"
                          description="سيتم حذف هذه المسودة نهائياً. لا يمكن التراجع."
                          confirmLabel="حذف المسودة"
                          loading={isDeletingThis}
                          onConfirm={() => deleteMutation.mutateAsync(m.id)}
                        />
                      )}
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

function ChannelBadge({ channel }: { channel: BroadcastMessage['channel'] }) {
  if (channel === 'wallet') {
    return (
      <Badge className="bg-indigo-500/15 text-indigo-700 border-indigo-500/30 border">
        <Wallet className="w-3 h-3 me-1" />
        Wallet
      </Badge>
    )
  }
  if (channel === 'email') {
    return (
      <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 border">
        <Mail className="w-3 h-3 me-1" />
        إيميل
      </Badge>
    )
  }
  if (channel === 'push') {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 border">
        <Bell className="w-3 h-3 me-1" />
        تنبيه
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">
      <Send className="w-3 h-3 me-1" />
      SMS
    </Badge>
  )
}

function StatusBadge({ status }: { status: BroadcastMessage['status'] }) {
  const config = {
    draft: { label: 'مسودة', className: 'bg-muted text-muted-foreground border', Icon: Clock },
    sending: { label: 'قيد الإرسال', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 border', Icon: Send },
    sent: { label: 'تم الإرسال', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border', Icon: CheckCircle2 },
    failed: { label: 'فشل', className: 'bg-destructive/15 text-destructive border-destructive/30 border', Icon: XCircle },
  } as const
  const { label, className, Icon } = config[status]
  return (
    <span className={cn('inline-flex items-center text-[10px] px-2 py-0.5 rounded-full', className)}>
      <Icon className="w-2.5 h-2.5 me-1" />
      {label}
    </span>
  )
}
