import {
  MessageSquare,
  Send,
  Users,
  Filter,
  Clock,
  Mail,
  Smartphone,
  Bell,
  Eye,
  CheckCircle2,
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
  MockUI,
  IconRow,
} from './_components'

/**
 * Help article: "إرسال رسائل للعملاء"
 * Explains how merchants send broadcast messages (SMS, email, push).
 */
export default function MessagesArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
            <InfoChip icon={MessageSquare} label="المستوى: متوسط" />
          </>
        }
      >
        صفحة <strong>الرسائل</strong> تسمح لك بإرسال رسائل جماعية لعملائك —
        عروض، تذكيرات، إعلان منتج جديد، أو تهنئة بمناسبة. الرسالة تصل عبر
        SMS أو البريد الإلكتروني أو إشعار في التطبيق.
      </Intro>

      <Step number={1} title="ابدأ رسالة جديدة" icon={Send}>
        <p>
          من القائمة الجانبية اضغط <UILabel>الرسائل</UILabel>، ثم{' '}
          <InlineButton icon={Send}>+ رسالة جديدة</InlineButton>.
        </p>
        <p>ستفتح صفحة تحرير الرسالة مقسّمة إلى:</p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>اختيار الفئة المستهدفة</li>
          <li>اختيار قناة الإرسال</li>
          <li>كتابة الرسالة والمعاينة</li>
          <li>الإرسال (أو الجدولة لوقت لاحق)</li>
        </ul>
      </Step>

      <Step number={2} title="اختر الفئة المستهدفة" icon={Filter}>
        <p>لا ترسل للكل دائماً — الرسالة المستهدفة أقوى. الفئات المتاحة:</p>

        <MockUI title="فئات الإرسال">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <IconRow
              icon={<Users className="h-5 w-5" />}
              title="كل العملاء"
              desc="كل من سجّل في أي بطاقة"
            />
            <IconRow
              icon={<Filter className="h-5 w-5" />}
              title="عملاء بطاقة محددة"
              desc="فقط أصحاب بطاقة معيّنة"
            />
            <IconRow
              icon={<Clock className="h-5 w-5" />}
              title="غير نشطين"
              desc="لم يزوروا منذ X يوم"
            />
            <IconRow
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="نشطون"
              desc="زاروا مؤخراً"
            />
          </div>
        </MockUI>
      </Step>

      <Step number={3} title="اختر قناة الإرسال" icon={Bell}>
        <p>
          الرسالة يمكن أن تصل عبر أكثر من قناة — اختر الأنسب:
        </p>
        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={Smartphone}
            title="SMS — الرسائل النصية"
            details={[
              'تصل 100% للعميل — ما تحتاج تطبيق',
              'محدودة بـ 160 حرف في اللغة العربية تكون أقل',
              'الأنسب للعروض العاجلة والتذكيرات المهمة',
              'تُحتسب ضمن باقة SMS في اشتراكك',
            ]}
          />
          <DetailBlock
            icon={Mail}
            title="البريد الإلكتروني"
            details={[
              'مجاني وبدون حد للطول',
              'مناسب للمحتوى الطويل والصور والعروض التفصيلية',
              'يصل للذين أدخلوا بريدهم عند التسجيل',
            ]}
          />
          <DetailBlock
            icon={Bell}
            title="إشعار التطبيق (Push)"
            details={[
              'مجاني وسريع — يظهر على شاشة الجوال مباشرة',
              'يصل للذين حمّلوا تطبيق ستامبلي وفعّلوا الإشعارات',
              'الأنسب للعروض اللحظية',
            ]}
          />
        </div>
      </Step>

      <Step number={4} title="اكتب الرسالة وعاين" icon={Eye}>
        <ol className="list-decimal ps-5 space-y-2">
          <li>اكتب العنوان (للبريد والإشعار فقط)</li>
          <li>اكتب المحتوى — تقدر تستخدم <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{'{{name}}'}</code> ليظهر اسم العميل</li>
          <li>
            اضغط <UILabel>معاينة</UILabel> لتشوف الشكل النهائي قبل الإرسال
          </li>
        </ol>
        <Tip>
          💡 اجعل الرسالة شخصية وقصيرة ومحددة. مثال جيد:{' '}
          <em>"مرحبا {'{{name}}'}! عرض اليوم فقط: قهوة مجانية مع أي كرواسون ✨"</em>
        </Tip>
      </Step>

      <Step number={5} title="أرسل أو جدول" icon={Send}>
        <p>عندك خيارين:</p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>
            <strong>إرسال فوري</strong> — الرسالة تذهب لكل الفئة المستهدفة
            خلال ثوانٍ
          </li>
          <li>
            <strong>جدولة</strong> — حدد وقت مستقبلي (مثل 9 صباحاً جمعة)
            ليرسلها النظام تلقائياً
          </li>
        </ul>
        <Warning>
          ⚠️ <strong>راجع الرسالة مرتين قبل الإرسال</strong> — بعد الإرسال ما تقدر
          تستدعيها. راجع الأسماء، الأرقام، التوقيت، والرابط (إن وُجد).
        </Warning>
      </Step>

      <Step number={6} title="تابع نتيجة الرسالة" icon={CheckCircle2}>
        <p>بعد الإرسال اضغط على الرسالة من القائمة لترى:</p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>عدد المستلمين</li>
          <li>عدد الرسائل التي وصلت فعلاً</li>
          <li>عدد الأخطاء (أرقام خاطئة، بريد غير صحيح)</li>
          <li>التكلفة (لرسائل SMS)</li>
        </ul>
        <div className="space-y-3 mt-4">
          <NoteCard
            emoji="📊"
            title="توقيت الإرسال مهم"
            body="جرّب تبعث الساعة 11 صباحاً أو 5 عصراً — تجنّب الفجر ومنتصف الليل."
          />
          <NoteCard
            emoji="🎯"
            title="لا تُكثر"
            body="أكثر من رسالة بالأسبوع تجعل العملاء يحجبونك. 2-4 رسائل شهرياً كافية."
          />
          <NoteCard
            emoji="💰"
            title="SMS لها تكلفة"
            body="كل رسالة نصية تُخصم من باقتك — استخدمها للرسائل المهمة فقط، والإيميل للبقية."
          />
        </div>
      </Step>
    </div>
  )
}
