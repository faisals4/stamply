import { useQuery } from '@tanstack/react-query'
import {
  Mail,
  Smartphone,
  Check,
  AlertCircle,
  Bell,
  Settings as SettingsIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EditButton } from '@/components/ui/edit-button'
import { getWalletAvailability } from '@/lib/phase1Api'
import { EditableBrandCard } from './settings/EditableBrandCard'

/**
 * /settings — central place for tenant config. Phase 1 ships a read-only
 * status overview; editing and branding controls arrive in later phases.
 */
export default function SettingsPage() {
  const { data: wallet } = useQuery({
    queryKey: ['wallet-availability'],
    queryFn: getWalletAvailability,
  })

  return (
    <div>
      <PageHeader
        className="mb-8"
        icon={<SettingsIcon />}
        title="الإعدادات"
        subtitle="تكوين المنصة والعلامة التجارية والتكاملات"
      />

      <div className="space-y-4 sm:space-y-6 max-w-3xl">
        {/* Business brand — editable (name, logo, subdomain, description) */}
        <EditableBrandCard />

        {/* Messaging providers */}
        <Section
          icon={<Mail className="w-5 h-5 text-emerald-500" />}
          title="البريد والرسائل النصية"
          subtitle="المزودات المستخدمة للإشعارات والتواصل مع العملاء"
        >
          <StatusRow
            icon={<Mail className="w-4 h-4" />}
            label="البريد الإلكتروني (SendGrid SMTP)"
            enabled={wallet?.email ?? false}
            note={
              wallet?.email
                ? 'جاهز للإرسال — اضغط لعرض الإعدادات والتعديل'
                : 'يتطلب ضبط مزود SMTP — اضغط لفتح صفحة الدمج'
            }
            editHref="/admin/settings/integrations/email"
          />
          <StatusRow
            icon={<Smartphone className="w-4 h-4" />}
            label="الرسائل النصية (Twilio)"
            enabled={wallet?.sms ?? false}
            note={
              wallet?.sms
                ? 'جاهز للإرسال — اضغط لعرض الإعدادات والتعديل'
                : 'يتطلب ضبط Twilio — اضغط لفتح صفحة الدمج'
            }
            editHref="/admin/settings/integrations/sms"
          />
          <StatusRow
            icon={<Bell className="w-4 h-4" />}
            label="التنبيهات (Web Push / APNs / FCM)"
            enabled={false}
            note="البنية جاهزة — يتطلب إكمال طبقة الإرسال ومفاتيح المزود"
            editHref="/admin/settings/integrations/push"
          />
        </Section>

        {/* About */}
        <Section title="عن Stamply" subtitle="منصة بطاقات ولاء رقمية متعددة المستأجرين">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Stamply يساعدك على بناء برنامج ولاء احترافي مع بطاقات رقمية تُثبَّت
              مباشرة في Apple Wallet و Google Wallet.
            </p>
            <p className="text-xs">
              الإصدار الحالي: <span className="font-mono">0.1.0 — Phase 1 MVP</span>
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <header className="flex items-start gap-3 mb-4">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function StatusRow({
  icon,
  label,
  enabled,
  note,
  editHref,
}: {
  icon: React.ReactNode
  label: string
  enabled: boolean
  note?: string
  /** When provided, shows an edit (pencil) button that navigates to this URL. */
  editHref?: string
}) {
  const body = (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {enabled ? (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Check className="w-2.5 h-2.5" />
              مفعّل
            </span>
          ) : (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" />
              غير مفعّل
            </span>
          )}
        </div>
        {note && <div className="text-xs text-muted-foreground mt-0.5">{note}</div>}
      </div>
      {editHref && <EditButton href={editHref} label="تعديل الإعدادات" />}
    </div>
  )

  return body
}
