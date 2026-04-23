import {
  Rocket,
  CheckCircle2,
  CreditCard,
  ScanLine,
  Users,
  Share2,
  Palette,
  Clock,
  ListChecks,
  Smartphone,
} from 'lucide-react'
import {
  Step,
  Tip,
  UILabel,
  InlineButton,
  InfoChip,
  NoteCard,
  Intro,
  IconRow,
  MockUI,
} from './_components'

/**
 * Help article: "دليل البداية السريعة"
 * Landing-level article that maps out the first week for a new merchant.
 */
export default function GettingStartedArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 5 دقائق" />
            <InfoChip icon={Rocket} label="المستوى: مبتدئ" />
          </>
        }
      >
        مرحباً بك في ستامبلي! هذا الدليل يأخذك خطوة بخطوة من اللحظة التي
        سجّلت فيها إلى إصدار بطاقة ولاء فعّالة في متجرك. اتبع الترتيب وستكون
        جاهز لاستقبال أول عميل خلال ساعة.
      </Intro>

      <Step number={1} title="أكمل بيانات متجرك" icon={Palette}>
        <p>
          قبل أي شيء، افتح <UILabel>الإعدادات</UILabel> وضع:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>اسم المتجر كما يعرفه عملاؤك</li>
          <li>شعار المتجر (PNG مربع، 512×512 يكفي)</li>
          <li>اللون الأساسي لهويتك</li>
        </ul>
        <Tip>
          💡 البيانات هذي تظهر تلقائياً على البطاقات، الرسائل، وفي تطبيق
          العملاء — خذ وقتك لضبطها بشكل صحيح.
        </Tip>
      </Step>

      <Step number={2} title="أنشئ أول بطاقة ولاء" icon={CreditCard}>
        <p>
          من صفحة <UILabel>البطاقات</UILabel>، اضغط{' '}
          <InlineButton>+ إنشاء بطاقة</InlineButton> وحدّد:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>نوع البطاقة (أختام عادةً)</li>
          <li>عدد الأختام المطلوبة (6-10 شائع للمقاهي)</li>
          <li>المكافأة (قهوة مجانية، خصم، إلخ)</li>
          <li>التصميم والألوان</li>
        </ul>
        <Tip>
          💡 فيه مقال تفصيلي:{' '}
          <a
            href="/help/add-new-card"
            className="text-primary underline underline-offset-2"
          >
            كيف تضيف بطاقة جديدة
          </a>
          .
        </Tip>
      </Step>

      <Step number={3} title="أضف فروعك وموظفيك" icon={Users}>
        <div className="space-y-3">
          <IconRow
            icon={<Users className="h-5 w-5" />}
            title="المستخدمون"
            desc="ضيف الكاشير والمدير — كل واحد بصلاحياته"
          />
          <IconRow
            icon={<Users className="h-5 w-5" />}
            title="المواقع"
            desc="ضيف كل فرع بعنوانه وإحداثياته"
          />
        </div>
        <p className="mt-3">
          تقدر تبدأ بفرع واحد ومستخدم واحد، وتوسّع لاحقاً.
        </p>
      </Step>

      <Step number={4} title="انشر البطاقة واجمع أول عميل" icon={Share2}>
        <p>من صفحة البطاقة، اضغط <InlineButton icon={Share2}>نشر البطاقة</InlineButton> لتحصل على:</p>

        <MockUI title="طرق توصيل البطاقة للعميل">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <IconRow
              icon={<Smartphone className="h-5 w-5" />}
              title="رابط تسجيل"
              desc="شاركه على واتساب، انستقرام، أو في رسالة"
            />
            <IconRow
              icon={<Share2 className="h-5 w-5" />}
              title="QR Code"
              desc="اطبعه وضعه على الكاونتر"
            />
          </div>
        </MockUI>
      </Step>

      <Step number={5} title="درّب الكاشير على الماسح" icon={ScanLine}>
        <p>
          قبل ما يصل أول عميل، اجلس مع الكاشير ودرّبه على{' '}
          <UILabel>ماسح بطاقات الولاء</UILabel>:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>كيف يبحث عن بطاقة العميل</li>
          <li>كيف يضيف ختم (وكيف يخصم لو غلط)</li>
          <li>كيف يصرف المكافأة عند الاكتمال</li>
        </ul>
        <Tip>
          💡 سجّل بطاقة تجريبية لنفسك وخلّي الكاشير يتمرّن عليها 3-4 مرات
          قبل الافتتاح الرسمي.
        </Tip>
      </Step>

      <Step number={6} title="راقب الأسبوع الأول" icon={ListChecks}>
        <p>أول 7 أيام مهمة جداً — راقب هذه المؤشرات يومياً:</p>
        <div className="space-y-3 mt-3">
          <NoteCard
            emoji="🎯"
            title="عدد البطاقات المُصدرة"
            body="كم عميل سجّل كل يوم؟ لو قليل — تحتاج تروّج أكثر (QR على الطاولة، يذكّر الكاشير)."
          />
          <NoteCard
            emoji="📈"
            title="عدد الأختام"
            body="كم ختم يُضاف يومياً؟ هذا مؤشر على استخدام الكاشير للنظام."
          />
          <NoteCard
            emoji="❓"
            title="اسأل العملاء"
            body="3-5 عملاء في اليوم الأول اسألهم: كانت العملية واضحة؟ هل البطاقة في Apple Wallet؟"
          />
        </div>
      </Step>

      <Step number={7} title="خطوات متقدمة لاحقاً" icon={CheckCircle2}>
        <p>بعد أول أسبوع ناجح، جرّب تفعيل:</p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>
            <strong>التفاعل والتنشيط</strong> — ختم مجاني في عيد الميلاد،
            ترحيب آلي للعملاء الجدد
          </li>
          <li>
            <strong>الرسائل الجماعية</strong> — أول حملة عروض لعملائك
          </li>
          <li>
            <strong>التقارير</strong> — راجع الأداء ووازن بين الأيام
          </li>
        </ul>
        <Tip>
          💡 لا تحاول تُشغّل كل المزايا في اليوم الأول — ابدأ بالبطاقة
          والماسح، وكل أسبوع فعّل ميزة جديدة.
        </Tip>
      </Step>
    </div>
  )
}
