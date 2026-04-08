import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'wouter'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Mail,
  Send,
  Users,
  Loader2,
  Bell,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  createMessage,
  sendMessage,
  type MessageChannel,
  type MessageAudience,
} from '@/lib/messagesApi'
import { MessageContentEditor } from '@/components/messaging/MessageContentEditor'
import { ReachStatCards } from '@/components/messaging/ReachStatCards'
import { BackButton } from '@/components/ui/back-button'

const VARIABLES = {
  'customer.first_name': 'الاسم الأول',
  'customer.full_name': 'الاسم الكامل',
  'customer.phone': 'رقم الجوال',
  'customer.email': 'البريد الإلكتروني',
  'brand.name': 'اسم النشاط',
}

const DEFAULT_SMS = 'مرحبا {{customer.first_name}}، شكراً لك على ولائك لـ {{brand.name}}!'

const DEFAULT_EMAIL_HTML = `<div style="font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h1 style="color: #003bc0; margin: 0 0 16px;">مرحباً {{customer.first_name}}!</h1>
  <p style="font-size: 16px; line-height: 1.6;">
    شكراً لك على ولائك لـ <strong>{{brand.name}}</strong>. لدينا عرض خاص اليوم نتمنى أن يعجبك.
  </p>
  <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
    مع أطيب التحيات،<br/>
    فريق {{brand.name}}
  </p>
</div>`

/**
 * /admin/messages/new — compose + send a broadcast.
 *
 * Page-level controls (channel, audience, recipient preview, send) live here.
 * The actual content editing UX uses the shared <MessageContentEditor> so it
 * matches the email/sms template editors exactly.
 */
export default function MessageComposePage() {
  const [, setLocation] = useLocation()
  const qc = useQueryClient()

  const [channel, setChannel] = useState<MessageChannel>('sms')
  const [audience, setAudience] = useState<MessageAudience>('all')
  const [inactiveDays, setInactiveDays] = useState(30)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState(DEFAULT_SMS)
  const [bodyTouched, setBodyTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [recipientPreview, setRecipientPreview] = useState<number | null>(null)

  // Auto-fill a sensible default body when the user picks a channel for the
  // first time. We don't overwrite if they've already started editing.
  useEffect(() => {
    if (bodyTouched) return
    setBody(channel === 'email' ? DEFAULT_EMAIL_HTML : DEFAULT_SMS)
  }, [channel, bodyTouched])

  const createMutation = useMutation({
    mutationFn: () =>
      createMessage({
        channel,
        audience,
        audience_meta: audience === 'inactive' ? { inactive_days: inactiveDays } : undefined,
        subject: channel === 'email' || channel === 'push' ? subject : undefined,
        body,
      }),
    onSuccess: (msg) => {
      setCreatedId(msg.id)
      setRecipientPreview(msg.recipients_count)
    },
    onError: (err) => setError(extractError(err) ?? 'تعذر الحفظ'),
  })

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(createdId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] })
      setLocation('/admin/messages')
    },
    onError: (err) => setError(extractError(err) ?? 'تعذر الإرسال'),
  })

  const onPreview = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    createMutation.mutate()
  }

  return (
    <div>
      <BackButton href="/admin/messages" label="الرسائل" />

      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold">رسالة جديدة</h1>
        <p className="text-muted-foreground text-sm mt-1">
          أرسل دفعة بريد إلكتروني أو SMS لشريحة من عملائك
        </p>
      </header>

      {/* Reach snapshot — dense row so it doesn't crowd the form.
          Each tile is still clickable for drill-down into the list
          of actual reachable customers. */}
      <ReachStatCards className="mb-5" dense />


      {/* Channel + audience picker — sit ABOVE the unified editor */}
      <form onSubmit={onPreview}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <Label className="mb-3 block">القناة</Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Wallet is the leading option — most tenants have
                  more cardholders in Apple Wallet than push/email/SMS
                  subscribers, and the UX (lock-screen notification on
                  back-field change) is the closest thing to a "push"
                  most loyalty apps need. */}
              <ChannelOption
                active={channel === 'wallet'}
                onClick={() => setChannel('wallet')}
                icon={<Wallet className="w-5 h-5" />}
                title="Apple Wallet"
                description="إشعار lock-screen لحاملي البطاقات"
              />
              <ChannelOption
                active={channel === 'push'}
                onClick={() => setChannel('push')}
                icon={<Bell className="w-5 h-5" />}
                title="تنبيه المتصفّح"
                description="Web Push للمشتركين في الإشعارات"
              />
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
                  inputMode="numeric"
                  min={1}
                  max={365}
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(Number(e.target.value))}
                  disabled={audience !== 'inactive'}
                  className="w-16 sm:w-20 h-7"
                />
                <span className="text-sm text-muted-foreground">يوم</span>
              </label>
            </div>
          </div>
        </div>

        {/* Unified editor + live preview (same component as email/sms template editors) */}
        <MessageContentEditor
          channel={channel}
          subject={subject}
          onSubjectChange={setSubject}
          body={body}
          onBodyChange={(b) => {
            setBody(b)
            setBodyTouched(true)
          }}
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
        <div className="mt-6">
          {createdId !== null && recipientPreview !== null ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">جاهز للإرسال</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  سيتم إرسال هذه الرسالة إلى{' '}
                  <span className="font-bold text-primary">{recipientPreview}</span> عميل
                </div>
              </div>
              <Button
                type="button"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || recipientPreview === 0}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                ) : (
                  <Send className="w-4 h-4 me-1.5" />
                )}
                إرسال الآن
              </Button>
            </div>
          ) : (
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
              ) : (
                <Users className="w-4 h-4 me-1.5" />
              )}
              معاينة المستلمين
            </Button>
          )}
        </div>
      </form>
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
