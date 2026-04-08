import {
  Bell,
  BellOff,
  Sparkles,
  Gift,
  Coffee,
  ThumbsUp,
  PartyPopper,
  Check,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type {
  CardTemplate,
  CardNotifications,
  NotificationTrigger,
  NotificationTriggerKey,
} from '@/types/card'

/**
 * /admin/cards/:id → "التنبيهات" tab.
 *
 * Controlled component: lives inside the card editor's state tree
 * just like InfoTab / DesignTab / SettingsTab. It reads triggers
 * from `card.notifications` and emits changes via `onChange` so the
 * main "حفظ البطاقة" button in the editor persists notifications
 * together with the rest of the template in ONE PUT request. There
 * is no separate save button for notifications — unified flow.
 */

interface Props {
  card: CardTemplate
  onChange: (patch: Partial<CardTemplate>) => void
}

// Per-trigger visual metadata. Kept client-side because it's purely
// presentational; the canonical trigger keys live on the backend.
const TRIGGER_META: Record<
  NotificationTriggerKey,
  {
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
    accent: string
  }
> = {
  welcome: {
    icon: Sparkles,
    title: 'الترحيب',
    description: 'يُرسل مرّة واحدة عند إصدار البطاقة لأول مرّة',
    accent: 'text-indigo-600 bg-indigo-500/10',
  },
  halfway: {
    icon: Coffee,
    title: 'منتصف الطريق',
    description: 'عند جمع نصف الأختام المطلوبة',
    accent: 'text-amber-600 bg-amber-500/10',
  },
  almost_there: {
    icon: ThumbsUp,
    title: 'باقي ختم واحد',
    description: 'عند بقاء خطوة واحدة فقط للوصول للمكافأة',
    accent: 'text-orange-600 bg-orange-500/10',
  },
  reward_ready: {
    icon: Gift,
    title: 'المكافأة جاهزة',
    description: 'عند اكتمال الأختام وجاهزية المكافأة للاستبدال',
    accent: 'text-emerald-600 bg-emerald-500/10',
  },
  redeemed: {
    icon: PartyPopper,
    title: 'شكراً بعد الاستبدال',
    description: 'بعد استبدال المكافأة وبدء البطاقة من جديد',
    accent: 'text-pink-600 bg-pink-500/10',
  },
}

const TRIGGER_ORDER: NotificationTriggerKey[] = [
  'welcome',
  'halfway',
  'almost_there',
  'reward_ready',
  'redeemed',
]

const CHAR_LIMIT = 500

export function NotificationsTab({ card, onChange }: Props) {
  const triggers = card.notifications

  const patchTrigger = (
    key: NotificationTriggerKey,
    patch: Partial<NotificationTrigger>,
  ) => {
    const next: CardNotifications = {
      ...triggers,
      [key]: { ...triggers[key], ...patch },
    }
    onChange({ notifications: next })
  }

  const activeCount = TRIGGER_ORDER.filter((k) => triggers[k]?.enabled).length

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header — explains the feature and shows the enable counter */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">التنبيهات التلقائية</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              تنبيهات ذكية تصل للعميل تلقائياً في اللحظة المناسبة خلال رحلته مع
              بطاقتك. تظهر كإشعار رسمي على شاشة قفل iPhone عبر Apple Wallet، بدون
              أي تطبيقات خارجية. لغة الإشعار تتبع لغة العميل المُسجَّلة (عربي /
              إنجليزي).
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3">
              <span className="inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                مُفعَّل: <span className="font-semibold">{activeCount}</span> /{' '}
                {TRIGGER_ORDER.length}
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                رسمية وآمنة عبر Apple PassKit
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Triggers */}
      <div className="space-y-3">
        {TRIGGER_ORDER.map((key) => (
          <TriggerCard
            key={key}
            triggerKey={key}
            trigger={triggers[key]}
            onChange={(patch) => patchTrigger(key, patch)}
          />
        ))}
      </div>

      {/* No save bar — the editor's main "حفظ البطاقة" button at the
          top persists notifications together with the rest of the
          card in one atomic PUT /cards/:id request. */}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */

function TriggerCard({
  triggerKey,
  trigger,
  onChange,
}: {
  triggerKey: NotificationTriggerKey
  trigger: NotificationTrigger
  onChange: (patch: Partial<NotificationTrigger>) => void
}) {
  const meta = TRIGGER_META[triggerKey]
  const Icon = meta.icon
  const isOff = !trigger.enabled

  return (
    <section
      className={cn(
        'rounded-xl border bg-card p-5 transition-opacity',
        isOff && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            meta.accent,
          )}
        >
          {isOff ? (
            <BellOff className="w-5 h-5" />
          ) : (
            <Icon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm">{meta.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {meta.description}
              </div>
            </div>
            <Switch
              checked={trigger.enabled}
              onCheckedChange={(v) => onChange({ enabled: v })}
              aria-label={`تفعيل ${meta.title}`}
            />
          </div>

          {/* Bilingual message fields — always visible, even when the
              trigger is off, so the merchant can prep copy before
              flipping the switch. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <MessageField
              label="الرسالة بالعربية"
              dir="rtl"
              value={trigger.message_ar}
              onChange={(v) => onChange({ message_ar: v })}
              placeholder="مثال: ☕ باقي لك خطوة وتحصل على مكافأتك"
              disabled={isOff}
            />
            <MessageField
              label="Message (English)"
              dir="ltr"
              value={trigger.message_en}
              onChange={(v) => onChange({ message_en: v })}
              placeholder="Example: ☕ Just one more step to your reward"
              disabled={isOff}
            />
          </div>

          {/* Variables hint */}
          <div className="text-[10px] text-muted-foreground mt-2 font-mono" dir="ltr">
            {'{{customer.first_name}}'} · {'{{brand.name}}'} ·{' '}
            {'{{reward.name}}'} · {'{{stamps_remaining}}'} ·{' '}
            {'{{stamps_collected}}'}
          </div>
        </div>
      </div>
    </section>
  )
}

function MessageField({
  label,
  dir,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  dir: 'rtl' | 'ltr'
  value: string
  onChange: (v: string) => void
  placeholder: string
  disabled: boolean
}) {
  const charsLeft = CHAR_LIMIT - value.length
  const isOver = charsLeft < 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-[11px]">{label}</Label>
        <span
          className={cn(
            'text-[10px] tabular-nums',
            isOver ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {charsLeft}
        </span>
      </div>
      <Textarea
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="resize-none text-sm"
      />
    </div>
  )
}
