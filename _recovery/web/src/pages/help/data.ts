import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CreditCard,
  Rocket,
  ScanLine,
  Users,
  Zap,
  MessageSquare,
  MapPin,
  Shield,
  BarChart3,
  Settings,
  Crown,
  Megaphone,
  AlertTriangle,
} from 'lucide-react'

/**
 * Static article registry — every entry drives the help-center index
 * grid and the slug → component resolution in HelpArticle.
 *
 * Adding a new article:
 *   1. Create `articles/your-slug.tsx` exporting a default component.
 *   2. Lazy-import it below.
 *   3. Append an entry to `ARTICLES`.
 * That's it — no backend/migration/deploy step, just a source change.
 *
 * Articles are ordered from most-needed to least-needed so a new
 * merchant can work through them top-to-bottom.
 */

export type HelpArticle = {
  slug: string
  title: string
  description: string
  icon: LucideIcon
  category: string
  /** Lazy-loaded so the index page doesn't bundle every article. */
  Component: ComponentType
}

// ─── Article imports ────────────────────────────────────────────
import GettingStarted from './articles/getting-started'
import AddNewCard from './articles/add-new-card'
import CashierScan from './articles/cashier-scan'
import ManageCustomers from './articles/manage-customers'
import Automations from './articles/automations'
import Messages from './articles/messages'
import Locations from './articles/locations'
import StaffPermissions from './articles/staff-permissions'
import Reports from './articles/reports'
import BrandingIntegrations from './articles/branding-integrations'
import SubscriptionBilling from './articles/subscription-billing'
import PromoteCards from './articles/promote-cards'
import WalletAnnouncements from './articles/wallet-announcements'
import Troubleshooting from './articles/troubleshooting'

// ─── Article catalogue ─────────────────────────────────────────
export const ARTICLES: HelpArticle[] = [
  {
    slug: 'getting-started',
    title: 'دليل البداية السريعة',
    description: 'من التسجيل إلى استقبال أول عميل — 7 خطوات لبدء استخدام ستامبلي',
    icon: Rocket,
    category: 'البداية',
    Component: GettingStarted,
  },
  {
    slug: 'add-new-card',
    title: 'كيف تضيف بطاقة جديدة',
    description: 'خطوات إنشاء بطاقة ولاء جديدة من الصفر ونشرها لعملائك',
    icon: CreditCard,
    category: 'البطاقات',
    Component: AddNewCard,
  },
  {
    slug: 'cashier-scan',
    title: 'استخدام ماسح بطاقات الولاء',
    description: 'كيف يُضيف الكاشير الأختام ويصرف المكافآت للعملاء يومياً',
    icon: ScanLine,
    category: 'التشغيل اليومي',
    Component: CashierScan,
  },
  {
    slug: 'promote-cards',
    title: 'كيف تُروّج لبطاقة ولائك',
    description: 'أفضل الطرق لجذب العملاء للتسجيل في بطاقة الولاء داخل المتجر وعبر السوشيال',
    icon: Megaphone,
    category: 'التسويق',
    Component: PromoteCards,
  },
  {
    slug: 'manage-customers',
    title: 'إدارة العملاء',
    description: 'عرض، تصفية، وفهم بيانات عملائك — من الجدد للغير نشطين',
    icon: Users,
    category: 'العملاء',
    Component: ManageCustomers,
  },
  {
    slug: 'automations',
    title: 'التفاعل والتنشيط التلقائي',
    description: 'إعداد رسائل وختمات تلقائية لعيد الميلاد والعملاء غير النشطين',
    icon: Zap,
    category: 'التسويق',
    Component: Automations,
  },
  {
    slug: 'messages',
    title: 'إرسال رسائل للعملاء',
    description: 'حملات SMS وبريد وإشعارات للترويج والتذكير وإعادة الجذب',
    icon: MessageSquare,
    category: 'التسويق',
    Component: Messages,
  },
  {
    slug: 'wallet-announcements',
    title: 'إعلانات Apple & Google Wallet',
    description: 'رسائل مجانية تظهر على بطاقة العميل في محفظته الرقمية مباشرة',
    icon: Megaphone,
    category: 'التسويق',
    Component: WalletAnnouncements,
  },
  {
    slug: 'locations',
    title: 'إدارة الفروع والمواقع',
    description: 'أضف فروعك مع الإحداثيات والنطاق الجغرافي (Geofencing)',
    icon: MapPin,
    category: 'التشغيل',
    Component: Locations,
  },
  {
    slug: 'staff-permissions',
    title: 'المستخدمون والصلاحيات',
    description: 'أضف كاشير ومدراء وحدد صلاحيات كل موظف بشكل دقيق',
    icon: Shield,
    category: 'الإدارة',
    Component: StaffPermissions,
  },
  {
    slug: 'reports',
    title: 'التقارير وقراءة الأرقام',
    description: 'الأختام، المكافآت، البطاقات المُصدرة — وتصديرها كـ CSV',
    icon: BarChart3,
    category: 'التحليل',
    Component: Reports,
  },
  {
    slug: 'branding-integrations',
    title: 'الهوية البصرية والتكاملات',
    description: 'ضبط الشعار، الألوان، قوالب الرسائل، وتكاملات البريد والـSMS',
    icon: Settings,
    category: 'الإعدادات',
    Component: BrandingIntegrations,
  },
  {
    slug: 'subscription-billing',
    title: 'الاشتراك والفواتير',
    description: 'الخطط، الحدود، الترقية، والفواتير الضريبية',
    icon: Crown,
    category: 'الاشتراك',
    Component: SubscriptionBilling,
  },
  {
    slug: 'troubleshooting',
    title: 'حل المشاكل الشائعة',
    description: 'مرجع سريع لحل أكثر المشاكل التي تواجه التجار — الماسح، الرسائل، المحفظة، الدخول',
    icon: AlertTriangle,
    category: 'مرجع',
    Component: Troubleshooting,
  },
]

/** Lookup helper used by HelpArticle. */
export function findArticle(slug: string): HelpArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}

/** Next article after the given slug (wraps to first). */
export function nextArticle(slug: string): HelpArticle | undefined {
  const idx = ARTICLES.findIndex((a) => a.slug === slug)
  if (idx === -1) return undefined
  return ARTICLES[(idx + 1) % ARTICLES.length]
}
