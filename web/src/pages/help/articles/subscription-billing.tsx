import {
  Crown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  Users,
  MapPin,
  Stamp,
  MessageSquare,
} from 'lucide-react'
import {
  Step,
  Tip,
  Warning,
  UILabel,
  InlineButton,
  InfoChip,
  NoteCard,
  DetailBlock,
  Intro,
  IconRow,
  MockUI,
} from './_components'

/**
 * Help article: "الاشتراك والفواتير"
 * Explains plan, limits, upgrade, trial, billing.
 */
export default function SubscriptionBillingArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
            <InfoChip icon={Crown} label="المستوى: إداري" />
          </>
        }
      >
        صفحة <strong>الاشتراك</strong> هي حيث تدير باقتك، تعرف حدود استخدامك،
        وتقرّر الترقية. هذا الدرس يشرح كل ما يتعلق بالاشتراك والفواتير
        وحدود الخطة.
      </Intro>

      <Step number={1} title="افهم الخطط المتاحة" icon={Crown}>
        <p>
          ستامبلي يقدّم عدة خطط تتدرّج حسب حجم متجرك. اضغط{' '}
          <UILabel>الاشتراك</UILabel> من القائمة لعرض الخطط الحالية:
        </p>

        <MockUI title="ما يختلف بين الخطط">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <IconRow
              icon={<CreditCard className="h-5 w-5" />}
              title="عدد البطاقات"
              desc="كم قالب بطاقة ولاء تقدر تُنشئ"
            />
            <IconRow
              icon={<Users className="h-5 w-5" />}
              title="عدد العملاء"
              desc="الحد الأقصى للعملاء المسجّلين"
            />
            <IconRow
              icon={<MapPin className="h-5 w-5" />}
              title="عدد الفروع"
              desc="كم موقع تقدر تضيف"
            />
            <IconRow
              icon={<MessageSquare className="h-5 w-5" />}
              title="باقة SMS"
              desc="عدد رسائل SMS الشهرية المشمولة"
            />
          </div>
        </MockUI>
      </Step>

      <Step number={2} title="الفترة التجريبية" icon={TrendingUp}>
        <p>
          عند التسجيل الأول، تحصل على فترة تجريبية مجانية لتجرّب كل الميزات
          قبل ما تدفع.
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>خلال الفترة التجريبية، البطاقات والعملاء كلهم يشتغلون بشكل كامل</li>
          <li>الحدود مفعّلة (عدد البطاقات، العملاء، إلخ) — جرّبها لتعرف حجمك</li>
          <li>تقدر تشترك في أي لحظة قبل انتهاء التجربة</li>
        </ul>
        <Warning>
          ⚠️ عند انتهاء الفترة التجريبية بدون اشتراك، بعض الصفحات ستتعطّل —
          البطاقات الموجودة تبقى محفوظة لكن لا تستطيع إضافة أختام جديدة حتى
          تُجدّد الاشتراك.
        </Warning>
      </Step>

      <Step number={3} title="راقب حدود استخدامك" icon={TrendingUp}>
        <p>
          في صفحة الاشتراك، ستشاهد مؤشرات تبيّن كم استهلكت من خطتك:
        </p>
        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={Users}
            title="العملاء"
            details={[
              'مثلاً: 347 / 500 عميل',
              'حين تقترب من الحد، سيظهر تنبيه في لوحة التحكم',
              'لا يمكن تسجيل عملاء جدد بعد بلوغ الحد إلا بعد الترقية',
            ]}
          />
          <DetailBlock
            icon={CreditCard}
            title="البطاقات"
            details={[
              'مثلاً: 2 / 3 بطاقات',
              'لا يمكنك إنشاء بطاقة جديدة إذا بلغت الحد',
              'تقدر تحذف بطاقة قديمة لتحرير مكان',
            ]}
          />
          <DetailBlock
            icon={MessageSquare}
            title="رسائل SMS"
            details={[
              'تتجدّد شهرياً تلقائياً',
              'تقدر تشتري رسائل إضافية لو استهلكت الباقة',
              'الرسائل الزائدة تُخصم من الرصيد أو تفشل',
            ]}
          />
        </div>
      </Step>

      <Step number={4} title="رقِّ خطتك" icon={CheckCircle2}>
        <p>حين تحتاج ترقية (مثل تجاوز عدد العملاء):</p>
        <ol className="list-decimal ps-5 space-y-2 mt-2">
          <li>
            اضغط <InlineButton icon={Crown}>ترقية الخطة</InlineButton> في
            صفحة الاشتراك
          </li>
          <li>اختر الخطة الأعلى المناسبة لك</li>
          <li>أكّد الدفع — الترقية تبدأ فوراً</li>
          <li>الحدود الجديدة تُفعّل في نفس اللحظة</li>
        </ol>
        <Tip>
          💡 الترقية خلال الشهر تُحسب نسبياً — ما تدفع الشهر كامل إذا بقي 10
          أيام فقط من شهرك الحالي.
        </Tip>
      </Step>

      <Step number={5} title="الفواتير والسجل" icon={CreditCard}>
        <p>في قسم الفواتير ستجد:</p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>كل الفواتير السابقة للتحميل (PDF)</li>
          <li>وسيلة الدفع الحالية — تقدر تغيّرها</li>
          <li>موعد الدفع التالي</li>
          <li>إمكانية طلب فاتورة ضريبية رسمية</li>
        </ul>
      </Step>

      <Step number={6} title="أسئلة شائعة" icon={AlertTriangle}>
        <div className="space-y-3">
          <NoteCard
            emoji="❓"
            title="هل تنتهي الفترة التجريبية فجأة؟"
            body="لا — نذكّرك قبل الانتهاء بأيام عبر البريد والإشعار."
          />
          <NoteCard
            emoji="❓"
            title="إن لم أدفع، هل تُحذف بياناتي؟"
            body="لا — بياناتك تبقى محفوظة. عند التجديد يُعاد تفعيل كل شيء من حيث وقفت."
          />
          <NoteCard
            emoji="❓"
            title="هل يمكن النزول لخطة أقل؟"
            body="نعم — تقدر تخفّض الخطة من نفس الصفحة. يأخذ تأثيره من الدورة القادمة."
          />
          <NoteCard
            emoji="❓"
            title="كيف أُلغي الاشتراك؟"
            body='من صفحة الاشتراك، اضغط "إلغاء الاشتراك". البطاقات تبقى تعمل حتى نهاية الشهر المدفوع.'
          />
        </div>
      </Step>
    </div>
  )
}
