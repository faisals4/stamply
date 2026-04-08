import { useEffect, useState, type FormEvent } from 'react'
import { useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Mail,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  Save,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MessageContentEditor } from '@/components/messaging/MessageContentEditor'
import {
  getMessage,
  sendMessage,
  updateMessage,
  type BroadcastMessage,
  type MessageAudience,
  type MessageChannel,
} from '@/lib/messagesApi'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { formatDateTime as formatDate } from '@/lib/formatDate'

const VARIABLES = {
  'customer.first_name': 'الاسم الأول',
  'customer.full_name': 'الاسم الكامل',
  'customer.phone': 'رقم الجوال',
  'customer.email': 'البريد الإلكتروني',
  'brand.name': 'اسم النشاط',
}

/**
 * /admin/messages/:id — message detail page.
 *
 * - **Sent / failed messages** → read-only view (subject, body, stats, dates).
 * - **Drafts** → fully editable using the same shared <MessageContentEditor>
 *   used elsewhere. The user can update content/audience/channel and save,
 *   or hit "send now" to fire it off.
 */
export default function MessageDetailPage() {
  const [, params] = useRoute('/admin/messages/:id')
  const id = params?.id
  const qc = useQueryClient()

  const { data: message, isLoading } = useQuery({
    queryKey: ['messages', 'detail', id],
    queryFn: () => getMessage(id!),
    enabled: !!id,
  })

  // Local edit state — only used when message.status === 'draft'.
  const [channel, setChannel] = useState<MessageChannel>('sms')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<MessageAudience>('all')
  const [inactiveDays, setInactiveDays] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  // Hydrate the form whenever a fresh message arrives from the server.
  useEffect(() => {
    if (!message) return
    setChannel(message.channel)
    setSubject(message.subject ?? '')
    setBody(message.body)
    setAudience(message.audience)
    if (message.audience_meta?.inactive_days) {
      setInactiveDays(message.audience_meta.inactive_days)
    }
  }, [message])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateMessage(id!, {
        channel,
        audience,
        audience_meta: audience === 'inactive' ? { inactive_days: inactiveDays } : undefined,
        subject: channel === 'email' ? subject : undefined,
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['messages', 'detail', id] })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 3500)
    },
    onError: (err) => setError(extractError(err) ?? 'تعذر الحفظ'),
  })

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['messages', 'detail', id] })
    },
  })

  if (isLoading || !message) {
    return (
      <div className="min-h-64 flex items-center justify-center text-muted-foreground text-sm">
        جارٍ التحميل...
      </div>
    )
  }

  const isDraft = message.status === 'draft'

  return (
    <div className={isDraft ? '' : 'max-w-5xl'}>
      <BackButton href="/admin/messages" label="الرسائل" />

      <div className="flex items-center gap-2 mb-2">
        <ChannelBadge channel={message.channel} />
        <StatusBadge status={message.status} />
        {isDraft && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Pencil className="w-2.5 h-2.5" />
            قابلة للتعديل
          </span>
        )}
      </div>
      <PageHeader
        icon={<Mail />}
        title={
          isDraft
            ? 'تعديل المسودة'
            : (message.subject ?? message.body.slice(0, 80))
        }
        subtitle={
          message.creator ? `أنشأها: ${message.creator.name}` : undefined
        }
      />

      {/* Stats — same in both modes */}
      <section className="grid grid-cols-3 gap-3 mb-6">
        <StatBlock
          icon={<Users className="w-4 h-4 text-blue-500" />}
          label="المستلمون"
          value={message.recipients_count}
        />
        <StatBlock
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          label="نجحت"
          value={message.sent_count}
        />
        <StatBlock
          icon={<XCircle className="w-4 h-4 text-destructive" />}
          label="فشلت"
          value={message.failed_count}
        />
      </section>

      {isDraft ? (
        /* ─── DRAFT EDIT MODE ────────────────────────────────── */
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            setError(null)
            saveMutation.mutate()
          }}
        >
          {/* Channel + audience pickers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <Label className="mb-3 block">القناة</Label>
              <div className="grid grid-cols-2 gap-3">
                <ChannelOption
                  active={channel === 'sms'}
                  onClick={() => setChannel('sms')}
                  icon={<Send className="w-5 h-5" />}
                  title="SMS"
                  description="رسالة نصية إلى رقم الجوال"
                />
                <ChannelOption
                  active={channel === 'email'}
                  onClick={() => setChannel('email')}
                  icon={<Mail className="w-5 h-5" />}
                  title="بريد إلكتروني"
                  description="إيميل غني بـ HTML وعنوان"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <Label className="mb-3 block">المستلمون</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50">
                  <input
                    type="radio"
                    checked={audience === 'all'}
                    onChange={() => setAudience('all')}
                    className="accent-primary"
                  />
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">كل العملاء</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50">
                  <input
                    type="radio"
                    checked={audience === 'inactive'}
                    onChange={() => setAudience('inactive')}
                    className="accent-primary"
                  />
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">غير النشطين منذ</span>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={inactiveDays}
                    onChange={(e) => setInactiveDays(Number(e.target.value))}
                    disabled={audience !== 'inactive'}
                    className="w-20 h-7"
                  />
                  <span className="text-sm text-muted-foreground">يوم</span>
                </label>
              </div>
            </div>
          </div>

          {/* Shared editor + live preview */}
          <MessageContentEditor
            channel={channel}
            subject={subject}
            onSubjectChange={setSubject}
            body={body}
            onBodyChange={setBody}
            variables={VARIABLES}
            smsFromNumber="+12605303702"
            bodyHelper={
              channel === 'sms' && body.length > 160 ? (
                <span className="text-amber-600">
                  ⚠ {body.length} حرف — أطول من 160 حرف، قد يُحتسب كأكثر من رسالة SMS
                </span>
              ) : (
                <>
                  {body.length} / 2000 حرف
                  {channel === 'email' && ' — يدعم HTML كامل (ألوان، صور، روابط)'}
                </>
              )
            }
          />

          {error && <p className="text-sm text-destructive mt-4">{error}</p>}

          {/* Bottom action bar */}
          <div className="mt-6 rounded-xl border bg-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 text-sm text-muted-foreground">
              ستذهب إلى{' '}
              <span className="font-bold text-foreground">{message.recipients_count}</span> عميل
              {savedFlash && (
                <span className="text-emerald-600 ms-3">تم الحفظ ✓</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                ) : (
                  <Save className="w-4 h-4 me-1.5" />
                )}
                حفظ المسودة
              </Button>
              <Button
                type="button"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || message.recipients_count === 0}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                ) : (
                  <Send className="w-4 h-4 me-1.5" />
                )}
                إرسال الآن
              </Button>
            </div>
          </div>
        </form>
      ) : (
        /* ─── READ-ONLY MODE (sent / failed) ─────────────────── */
        <>
          {message.subject && (
            <section className="rounded-xl border border-border bg-card p-5 mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">العنوان</h3>
              <p className="text-sm">{message.subject}</p>
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-5 mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">المحتوى</h3>
            {message.channel === 'email' ? (
              <div
                className="bg-white rounded border max-h-[600px] overflow-y-auto"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: message.body }}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {message.body}
              </pre>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-1">الجمهور</h3>
            <p className="text-sm">
              {message.audience === 'all'
                ? 'كل العملاء'
                : `العملاء غير النشطين منذ ${message.audience_meta?.inactive_days ?? 30} يوم`}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>تاريخ الإنشاء: {formatDate(message.created_at)}</span>
            </div>
            {message.sent_at && (
              <div className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5" />
                <span>تاريخ الإرسال: {formatDate(message.sent_at)}</span>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

function ChannelOption({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-start p-4 rounded-lg border transition',
        active
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-ring',
      )}
    >
      <div className={cn('mb-2', active ? 'text-primary' : 'text-muted-foreground')}>{icon}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
    </button>
  )
}

function ChannelBadge({ channel }: { channel: BroadcastMessage['channel'] }) {
  if (channel === 'email') {
    return (
      <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 border">
        <Mail className="w-3 h-3 me-1" />
        إيميل
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


function extractError(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined
    const firstErr = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
    return firstErr ?? data?.message
  }
  return undefined
}
