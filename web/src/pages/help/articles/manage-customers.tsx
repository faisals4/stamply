import {
  Users,
  Search,
  Filter,
  Eye,
  Cake,
  UserPlus,
  Activity,
  Clock,
  Phone,
  FileText,
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
 * Help article: "إدارة العملاء"
 * Explains the customers page: filters, search, detail view, activity.
 */
export default function ManageCustomersArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
            <InfoChip icon={Users} label="المستوى: متوسط" />
          </>
        }
      >
        صفحة <strong>العملاء</strong> تعطيك رؤية كاملة عن كل من سجّل في
        بطاقات ولائك — من هم؟ كم مرة زاروك؟ من يقترب من المكافأة؟ من لم
        يعد منذ شهر؟ هذه المعلومات هي أساس نمو متجرك.
      </Intro>

      <Step number={1} title="افتح قائمة العملاء" icon={Users}>
        <p>
          من القائمة الجانبية اضغط <UILabel>العملاء</UILabel>. ستظهر قائمة
          بجميع العملاء المسجّلين في بطاقاتك مع:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>الاسم ورقم الجوال</li>
          <li>عدد البطاقات التي يملكها</li>
          <li>عدد الأختام وآخر نشاط</li>
          <li>تاريخ التسجيل</li>
        </ul>
      </Step>

      <Step number={2} title="ابحث وصفِّ العملاء" icon={Filter}>
        <p>
          استخدم خانة <UILabel>البحث</UILabel> للبحث بالاسم أو رقم الجوال.
          وستجد بالأعلى فلاتر سريعة لتصنيف العملاء:
        </p>

        <MockUI title="فلاتر العملاء">
          <div className="grid grid-cols-2 gap-3">
            <IconRow
              icon={<UserPlus className="h-5 w-5" />}
              title="عملاء جدد"
              desc="مَن سجّلوا خلال آخر 7 أيام"
            />
            <IconRow
              icon={<Activity className="h-5 w-5" />}
              title="نشطون"
              desc="زاروك خلال آخر 30 يوم"
            />
            <IconRow
              icon={<Cake className="h-5 w-5" />}
              title="أعياد الميلاد"
              desc="من يوافق ميلادهم قريباً"
            />
            <IconRow
              icon={<Clock className="h-5 w-5" />}
              title="غير نشطين"
              desc="لم يزوروا منذ فترة"
            />
          </div>
        </MockUI>

        <Tip>
          💡 افتح فلتر <strong>"غير نشطين"</strong> أسبوعياً — هؤلاء العملاء
          يحتاجون رسالة تذكير لتعود. صفحة <UILabel>الرسائل</UILabel> تسمح لك
          بإرسال رسالة جماعية لهم فقط.
        </Tip>
      </Step>

      <Step number={3} title="افتح ملف العميل" icon={Eye}>
        <p>
          اضغط على أي عميل لفتح ملفه الشخصي. ستجد فيه:
        </p>
        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={Phone}
            title="المعلومات الأساسية"
            details={[
              'الاسم، الجوال، تاريخ الميلاد، البريد',
              'تقدر تعدّل أي حقل مباشرة',
              'العميل يقدر يعدّلها أيضاً من تطبيقه',
            ]}
          />
          <DetailBlock
            icon={FileText}
            title="بطاقات العميل"
            details={[
              'كل البطاقات التي اشترك فيها مع عدد الأختام الحالي',
              'يمكنك فتح أي بطاقة لرؤية تفاصيلها',
              'المكافآت التي صُرفت من كل بطاقة',
            ]}
          />
          <DetailBlock
            icon={Activity}
            title="سجل النشاط"
            details={[
              'كل زيارة (ختم) مع التاريخ والوقت واسم الكاشير',
              'كل مكافأة صُرفت',
              'كل رسالة وصلت للعميل من متجرك',
            ]}
          />
        </div>
      </Step>

      <Step number={4} title="تعديل أو حذف بطاقة عميل" icon={FileText}>
        <p>
          من داخل ملف العميل، افتح إحدى بطاقاته لتستطيع:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>إضافة أو خصم أختام يدوياً (لحالات خاصة)</li>
          <li>صرف مكافأة يدوياً</li>
          <li>تعطيل البطاقة (في حالات نادرة مثل الإساءة)</li>
        </ul>
        <Tip>
          💡 للإضافة السريعة اليومية استخدم{' '}
          <UILabel>ماسح بطاقات الولاء</UILabel> بدل الصفحة هذه — أسرع وأدق.
        </Tip>
      </Step>

      <Step number={5} title="نصائح لاستخدام بيانات العملاء" icon={Users}>
        <div className="space-y-3">
          <NoteCard
            emoji="🎂"
            title="استغل قائمة أعياد الميلاد"
            body="أرسل رسالة تهنئة + ختم مجاني — تجربة بسيطة لكنها تصنع ولاء حقيقي."
          />
          <NoteCard
            emoji="📉"
            title="تابع العملاء غير النشطين"
            body="العميل الذي لم يعد منذ 60 يوم يحتاج حافز للعودة — رسالة فيها خصم أو ختم مجاني."
          />
          <NoteCard
            emoji="🥇"
            title="عرّف كبار العملاء"
            body="العملاء الذين صرفوا مكافآت كثيرة هم سفراء متجرك — عاملهم بشكل خاص."
          />
          <NoteCard
            emoji="🔒"
            title="البيانات محفوظة"
            body="معلومات العملاء خاصة بمتجرك فقط ولا تُشارك مع أي تاجر آخر."
          />
        </div>
      </Step>
    </div>
  )
}
