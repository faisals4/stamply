import {
  BarChart3,
  TrendingUp,
  Stamp,
  Gift,
  CreditCard,
  Download,
  Filter,
  Calendar,
  Clock,
  LineChart,
} from 'lucide-react'
import {
  Step,
  Tip,
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
 * Help article: "قراءة التقارير والأرقام"
 * Explains Dashboard and Reports: stamps, redemptions, issued cards, CSV.
 */
export default function ReportsArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
            <InfoChip icon={BarChart3} label="المستوى: متوسط" />
          </>
        }
      >
        الأرقام ما تكذب — الداشبورد والتقارير يعطونك صورة واضحة: كم عميل
        جديد سجّل، كم ختم اليوم، أي بطاقة أفضل، ومتى تكون ذروة زياراتك. هذه
        المعلومات تساعدك تاخذ قرارات أفضل.
      </Intro>

      <Step number={1} title="الداشبورد — نظرة سريعة" icon={TrendingUp}>
        <p>
          الصفحة الأولى عند تسجيل الدخول. تعرض المؤشرات الأساسية لمتجرك:
        </p>

        <MockUI title="المؤشرات الرئيسية">
          <div className="grid grid-cols-2 gap-3">
            <IconRow
              icon={<CreditCard className="h-5 w-5" />}
              title="بطاقات مُصدرة"
              desc="كم عميل سجّل في بطاقاتك"
            />
            <IconRow
              icon={<Stamp className="h-5 w-5" />}
              title="أختام اليوم"
              desc="عدد الأختام اللي أُضيفت اليوم"
            />
            <IconRow
              icon={<Gift className="h-5 w-5" />}
              title="مكافآت صُرفت"
              desc="إجمالي المكافآت التي استُبدلت"
            />
            <IconRow
              icon={<LineChart className="h-5 w-5" />}
              title="الاتجاه الأسبوعي"
              desc="مقارنة بآخر 7 أيام"
            />
          </div>
        </MockUI>

        <Tip>
          💡 افتح الداشبورد أول شيء في الصباح — يعطيك نبض متجرك في 30 ثانية.
        </Tip>
      </Step>

      <Step number={2} title="افتح صفحة التقارير" icon={BarChart3}>
        <p>
          من القائمة الجانبية اضغط <UILabel>التقارير</UILabel>. ستجد 3 تبويبات
          رئيسية:
        </p>

        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={Stamp}
            title="الأختام (Stamps)"
            details={[
              'كل ختم أُضيف لعميل — متى، أي بطاقة، أي كاشير',
              'يمكنك الفلترة حسب التاريخ، الفرع، البطاقة، الكاشير',
              'مفيد لمعرفة ساعات الذروة ومقارنة أداء الكاشيرات',
            ]}
          />
          <DetailBlock
            icon={Gift}
            title="المكافآت (Redemptions)"
            details={[
              'كل مكافأة صُرفت — اسم العميل، المكافأة، التاريخ، الكاشير',
              'قارن المكافآت بين البطاقات — أي بطاقة تُصرف أكثر؟',
              'مهم للمحاسبة لمعرفة تكلفة الولاء',
            ]}
          />
          <DetailBlock
            icon={CreditCard}
            title="البطاقات المُصدرة (Issued Cards)"
            details={[
              'كل عميل سجّل في بطاقة — متى وأي بطاقة',
              'يعرض لك نمو قاعدة عملائك شهرياً',
              'مؤشر رئيسي لنجاح التسويق',
            ]}
          />
        </div>
      </Step>

      <Step number={3} title="استخدم الفلاتر بذكاء" icon={Filter}>
        <p>في أعلى كل تقرير، تجد خانات فلترة:</p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li><strong>الفترة الزمنية</strong> — اليوم، الأسبوع، الشهر، أو فترة مخصصة</li>
          <li><strong>الفرع</strong> — لو عندك أكثر من موقع</li>
          <li><strong>البطاقة</strong> — لو عندك أكثر من بطاقة ولاء</li>
          <li><strong>الكاشير</strong> — لعرض أداء موظف معيّن</li>
        </ul>
        <Tip>
          💡 قارن نفس الفترة مع الشهر اللي قبله — هل ارتفع عدد الأختام؟ كم
          نسبة الزيادة؟
        </Tip>
      </Step>

      <Step number={4} title="صدّر البيانات (CSV)" icon={Download}>
        <p>
          من زر <InlineButton icon={Download}>تصدير CSV</InlineButton> في أعلى
          كل تقرير، تقدر تنزّل البيانات لتستخدمها في:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>Excel أو Google Sheets لعمل تحليل أعمق</li>
          <li>المحاسبة وحساب التكاليف والضريبة</li>
          <li>عرضها على شركاء أو مستثمرين</li>
          <li>حفظ نسخة للأرشيف</li>
        </ul>
      </Step>

      <Step number={5} title="أسئلة تجاوبها التقارير" icon={LineChart}>
        <div className="space-y-3">
          <NoteCard
            emoji="📈"
            title="هل عدد عملائي ينمو؟"
            body="تقرير البطاقات المُصدرة حسب الشهر — خط صاعد معناه تسويقك ناجح."
          />
          <NoteCard
            emoji="⏰"
            title="متى ساعات الذروة؟"
            body="تقرير الأختام حسب الساعة — يساعدك تجدول موظفين أكثر في وقت الازدحام."
          />
          <NoteCard
            emoji="🏆"
            title="أي بطاقة الأنجح؟"
            body="قارن عدد البطاقات المُصدرة والمكافآت المصروفة بين بطاقاتك."
          />
          <NoteCard
            emoji="💸"
            title="كم تكلفة برنامج الولاء؟"
            body='عدد المكافآت × سعر المكافأة = التكلفة. قارنها بإيرادات العملاء المُتكررين.'
          />
          <NoteCard
            emoji="👤"
            title="أي كاشير أنشط؟"
            body="فلتر الأختام حسب الكاشير — تعرف الأسرع والأدق في استخدام البطاقات."
          />
        </div>
      </Step>
    </div>
  )
}
