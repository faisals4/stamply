import { useQuery } from '@tanstack/react-query'
import { getSubscription } from '@/lib/api/subscription'

/*
 * ══════════════════════════════════════════════════════════════════
 *  useSubscriptionGuard — حارس الاشتراك وحدود الباقة
 * ══════════════════════════════════════════════════════════════════
 *
 *  يُستخدم في كل صفحة فيها أزرار كتابة (حفظ، إنشاء، حذف، إرسال)
 *  لتعطيل الأزرار وعرض رسالة مناسبة عند:
 *    1. انتهاء الاشتراك (expired / disabled / days_remaining <= 0)
 *    2. تجاوز حدود الباقة (بطاقات / مواقع / مستخدمين)
 *
 *  ── الاستخدام ──────────────────────────────────────────────────
 *
 *  const guard = useSubscriptionGuard()
 *
 *  // حالة 1: تعطيل أي زر كتابة عند انتهاء الاشتراك
 *  <Button
 *    onClick={() => guard.blocked ? alert(guard.message) : handleSave()}
 *    className={guard.blocked ? 'opacity-60' : ''}
 *  >
 *
 *  // حالة 2: تعطيل زر إنشاء عند تجاوز حدود الباقة
 *  const createBlocked = guard.blocked || !guard.canCreate('cards')
 *  const createMsg = guard.blocked ? guard.message : guard.quotaMessage('cards')
 *
 *  ── الصفحات المحمية ────────────────────────────────────────────
 *
 *  البطاقات:
 *    • pages/cards/index.tsx      → إنشاء بطاقة، تعديل، حذف
 *    • pages/cards/Editor.tsx     → نشر، حفظ، حفظ وخروج
 *
 *  المواقع:
 *    • pages/locations/Locations.tsx → إضافة موقع، تعديل، حذف
 *
 *  الرسائل:
 *    • pages/messages/Messages.tsx       → رسالة جديدة
 *    • pages/messages/MessageCompose.tsx → معاينة المستلمين، إرسال الآن
 *    • pages/messages/MessageDetail.tsx  → حفظ المسودة، إرسال الآن
 *
 *  Apple Wallet:
 *    • pages/wallet/WalletAnnouncePage.tsx → بثّ الإعلان
 *
 *  ماسح الكاشير:
 *    • pages/scan/Scan.tsx → بحث عن بطاقة
 *
 *  ── طبقات الحماية ──────────────────────────────────────────────
 *
 *  الفرونتند (هذا الـ hook):
 *    يعطّل الأزرار ويعرض تنبيه — تجربة مستخدم واضحة
 *
 *  الباكند (خط الدفاع الثاني):
 *    • CheckSubscription middleware → يحظر POST/PUT/PATCH/DELETE عند الانتهاء
 *    • CheckPlanQuota middleware   → يحظر الإنشاء عند تجاوز الحد
 *    • axios interceptor (client.ts) → يعرض alert تلقائي لأي 403
 *
 * ══════════════════════════════════════════════════════════════════
 */
export function useSubscriptionGuard() {
  const { data: sub } = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscription,
    staleTime: 60_000,
  })

  // ── انتهاء الاشتراك ──────────────────────────────────────────
  // يُحظر عند: status=expired، status=disabled، أو days_remaining <= 0
  const isExpired = sub?.subscription_status === 'expired'
    || sub?.subscription_status === 'disabled'
    || (sub != null && sub.days_remaining <= 0)

  const expiredMessage = 'اشتراكك منتهي. تواصل مع الدعم لتجديد اشتراكك.'

  // ── حدود الباقة (Quota) ───────────────────────────────────────
  // يُستخدم فقط على أزرار الإنشاء (إنشاء بطاقة، إضافة موقع، إضافة مستخدم)
  const canCreate = (resource: 'cards' | 'locations' | 'users'): boolean => {
    if (!sub?.usage) return true
    const current = sub.usage[resource]
    const max = sub.usage[`${resource}_max` as keyof typeof sub.usage] as number
    return current < max
  }

  const quotaMessage = (resource: 'cards' | 'locations' | 'users'): string => {
    if (!sub?.usage) return ''
    const max = sub.usage[`${resource}_max` as keyof typeof sub.usage] as number
    const labels = { cards: 'البطاقات', locations: 'المواقع', users: 'المستخدمين' }
    return `وصلت للحد الأقصى من ${labels[resource]} (${max}) في باقتك الحالية. قم بترقية باقتك لزيادة العدد.`
  }

  return {
    /** هل الاشتراك منتهي؟ */
    isExpired,
    /** رسالة انتهاء الاشتراك */
    expiredMessage,
    /** هل يمكن إنشاء مورد جديد؟ (بطاقات/مواقع/مستخدمين) */
    canCreate,
    /** رسالة تجاوز الحد الأقصى */
    quotaMessage,
    /** حالة الحظر الشاملة — true عند انتهاء الاشتراك */
    blocked: isExpired,
    /** الرسالة المناسبة للعرض عند الحظر */
    message: isExpired ? expiredMessage : '',
  }
}
