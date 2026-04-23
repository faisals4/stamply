import {
  Zap,
  Cake,
  UserPlus,
  Bell,
  Clock,
  Play,
  Pause,
  History,
  Gift,
  MessageSquare,
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
  MockUI,
  IconRow,
} from './_components'

/**
 * Help article: "التفاعل والتنشيط (Automations)"
 * Explains setting up triggers like birthday stamps, welcome messages,
 * inactive-customer reminders.
 */
export default function AutomationsArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 4 دقائق" />
            <InfoChip icon={Zap} label="المستوى: متوسط" />
          </>
        }
      >
        <strong>التفاعل والتنشيط</strong> هي أقوى أداة لزيادة عودة العملاء —
        تنفّذ مهام تلقائياً نيابة عنك: ختم مجاني عيد الميلاد، رسالة ترحيب
        للعميل الجديد، تذكير للعميل الذي لم يزر منذ فترة. اضبطها مرة
        واحدة وهي تشتغل 24/7 من غير تدخل منك.
      </Intro>

      <Step number={1} title="افتح صفحة التفاعل والتنشيط" icon={Zap}>
        <p>
          من القائمة الجانبية اضغط <UILabel>التفاعل والتنشيط</UILabel>.
          ستظهر قائمة بكل التلقائيات المُعدّة مسبقاً ويمكنك إضافة جديدة
          بالضغط على <InlineButton>+ إضافة تلقائية</InlineButton>.
        </p>
      </Step>

      <Step number={2} title="اختر نوع التلقائية (Trigger)" icon={Play}>
        <p>
          كل تلقائية تبدأ بحدث (trigger) يُشغّلها. الأنواع المتاحة:
        </p>

        <MockUI title="أنواع المحفّزات">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <IconRow
              icon={<UserPlus className="h-5 w-5" />}
              title="عميل جديد سجّل"
              desc="رسالة ترحيب فور أول اشتراك"
            />
            <IconRow
              icon={<Cake className="h-5 w-5" />}
              title="عيد ميلاد العميل"
              desc="ختم مجاني أو مكافأة في يوم ميلاده"
            />
            <IconRow
              icon={<Clock className="h-5 w-5" />}
              title="عميل لم يعد منذ..."
              desc="تذكير بعد X يوم من آخر زيارة"
            />
            <IconRow
              icon={<Gift className="h-5 w-5" />}
              title="قرب المكافأة"
              desc="تنبيه حين يتبقى أختام قليلة"
            />
          </div>
        </MockUI>
      </Step>

      <Step number={3} title="حدّد الإجراء (Action)" icon={Bell}>
        <p>
          بعد اختيار المحفّز، حدّد ماذا يحصل تلقائياً:
        </p>
        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={MessageSquare}
            title="إرسال رسالة"
            details={[
              'تقدر ترسل رسالة نصية (SMS)، بريد إلكتروني، أو إشعار في التطبيق',
              'استخدم متغيرات مثل {{name}} لتشخيص الرسالة لكل عميل',
              'يمكنك معاينة الرسالة قبل التفعيل',
            ]}
          />
          <DetailBlock
            icon={Gift}
            title="إضافة ختم أو مكافأة"
            details={[
              'تقدر تضيف ختم مجاني تلقائي (مثال: عيد الميلاد)',
              'أو تصرف مكافأة كاملة كهدية',
              'الإضافة تنعكس فوراً على البطاقة',
            ]}
          />
        </div>
      </Step>

      <Step number={4} title="اختبر قبل التفعيل" icon={Play}>
        <p>
          قبل تفعيل التلقائية للجمهور كله، جرّبها على نفسك:
        </p>
        <ol className="list-decimal ps-5 space-y-2 mt-2">
          <li>أنشئ التلقائية لكن اتركها <UILabel>متوقفة</UILabel></li>
          <li>استخدم زر <strong>"تشغيل تجريبي"</strong> ليرسل لك الرسالة</li>
          <li>تأكد من اللغة، الصياغة، والتوقيت</li>
          <li>بعد ما تطمئن، فعّلها للجميع</li>
        </ol>
        <Tip>
          💡 جرّب على رقم جوالك أولاً — الأخطاء الإملائية في رسالة تُرسل لـ
          500 عميل محرجة ويصعب تعديلها بعد الإرسال.
        </Tip>
      </Step>

      <Step number={5} title="راقب السجل (Runs)" icon={History}>
        <p>
          لكل تلقائية سجل يعرض لك كم مرة تشغّلت ولمن أُرسلت. اضغط على أي
          تلقائية ثم <UILabel>السجل</UILabel> لتشاهد:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>عدد المرات التي تنفّذت</li>
          <li>قائمة العملاء الذين وصلتهم الرسالة/الختم</li>
          <li>أخطاء الإرسال (إن وُجدت)</li>
          <li>التاريخ والوقت لكل تنفيذ</li>
        </ul>
      </Step>

      <Step number={6} title="أمثلة عملية جاهزة" icon={Zap}>
        <div className="space-y-3">
          <NoteCard
            emoji="🎂"
            title="هدية عيد الميلاد"
            body="المحفّز: عيد ميلاد العميل → الإجراء: إضافة ختم مجاني + رسالة تهنئة. بسيطة وتصنع ذكرى جميلة."
          />
          <NoteCard
            emoji="👋"
            title="رسالة الترحيب"
            body="المحفّز: عميل جديد → الإجراء: رسالة شكر + شرح كيف يجمع الأختام. يرفع فرصة عودته للزيارة الثانية."
          />
          <NoteCard
            emoji="⏰"
            title="استرجاع العملاء"
            body='المحفّز: لم يزر منذ 30 يوم → الإجراء: SMS فيها "اشتقنالك، ختم مجاني هدية في زيارتك القادمة".'
          />
          <NoteCard
            emoji="🎯"
            title="تحفيز قرب المكافأة"
            body='المحفّز: باقي ختمين للمكافأة → الإجراء: إشعار "مكافأتك على بعد زيارتين!" — يرفع احتمال الزيارة.'
          />
        </div>
      </Step>
    </div>
  )
}
