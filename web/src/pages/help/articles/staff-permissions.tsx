import {
  Users,
  UserPlus,
  Shield,
  Key,
  Lock,
  Clock,
  ScanLine,
  Settings,
  BarChart3,
  Eye,
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
 * Help article: "إدارة المستخدمين والصلاحيات"
 * Explains adding cashiers/managers, role permissions.
 */
export default function StaffPermissionsArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
            <InfoChip icon={Shield} label="المستوى: إداري" />
          </>
        }
      >
        صفحة <strong>المستخدمون</strong> تسمح لك بإضافة فريق عملك — الكاشير،
        المدير، المحاسب — وتحدد لكل واحد منهم الصلاحيات المناسبة. هذا يحميك
        من الأخطاء ويُحافظ على بيانات عملائك.
      </Intro>

      <Step number={1} title="افهم الفرق بين الأدوار" icon={Shield}>
        <p>
          في ستامبلي عندنا 3 أنواع رئيسية من المستخدمين. اختر الدور المناسب
          حسب مهام كل موظف:
        </p>

        <MockUI title="الأدوار الرئيسية">
          <div className="space-y-3">
            <IconRow
              icon={<Key className="h-5 w-5" />}
              title="صاحب المتجر (Owner)"
              desc="صلاحيات كاملة — الإعدادات، الاشتراك، كل شيء"
            />
            <IconRow
              icon={<Shield className="h-5 w-5" />}
              title="مدير (Manager)"
              desc="إدارة البطاقات، العملاء، الرسائل، التقارير — بدون إعدادات الاشتراك"
            />
            <IconRow
              icon={<ScanLine className="h-5 w-5" />}
              title="كاشير (Cashier)"
              desc="فقط ماسح بطاقات الولاء لإضافة أختام وصرف مكافآت"
            />
          </div>
        </MockUI>
      </Step>

      <Step number={2} title="أضف مستخدم جديد" icon={UserPlus}>
        <ol className="list-decimal ps-5 space-y-2">
          <li>
            من القائمة الجانبية اضغط <UILabel>المستخدمون</UILabel>
          </li>
          <li>
            اضغط <InlineButton icon={UserPlus}>+ إضافة مستخدم</InlineButton>
          </li>
          <li>
            أدخل الاسم ورقم الجوال (الجوال هو وسيلة تسجيل الدخول)
          </li>
          <li>اختر الدور المناسب</li>
          <li>اضغط <UILabel>حفظ</UILabel></li>
        </ol>

        <Tip>
          💡 سيصل للمستخدم رمز تفعيل عبر SMS ليدخل من أول مرة. لو ما وصل،
          تقدر تضغط <strong>"إعادة إرسال كلمة مرور مؤقتة"</strong> من
          صفحته.
        </Tip>
      </Step>

      <Step number={3} title="خصّص الصلاحيات بدقة" icon={Lock}>
        <p>
          غير الأدوار الثلاثة، تقدر تفتح <UILabel>الصلاحيات التفصيلية</UILabel>{' '}
          لكل مستخدم لتحدّد بالضبط ماذا يقدر يفعل:
        </p>

        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={ScanLine}
            title="صلاحيات الماسح"
            details={[
              'إضافة أختام',
              'خصم أختام (قد لا يُسمح لكل كاشير)',
              'صرف مكافآت',
            ]}
          />
          <DetailBlock
            icon={Users}
            title="صلاحيات العملاء"
            details={[
              'عرض قائمة العملاء',
              'تعديل بيانات العميل',
              'إضافة/حذف بطاقات يدوياً',
            ]}
          />
          <DetailBlock
            icon={BarChart3}
            title="صلاحيات التقارير"
            details={[
              'عرض تقارير الأختام والمكافآت',
              'تصدير البيانات (CSV)',
            ]}
          />
          <DetailBlock
            icon={Settings}
            title="صلاحيات الإعدادات"
            details={[
              'تعديل الهوية (شعار، ألوان)',
              'إدارة البطاقات',
              'إدارة الرسائل والتلقائيات',
              'إدارة الفروع',
            ]}
          />
        </div>
      </Step>

      <Step number={4} title="تعديل أو إيقاف مستخدم" icon={Eye}>
        <ul className="list-disc ps-5 space-y-2">
          <li>
            اضغط على أي مستخدم من القائمة لتعديل صلاحياته أو دوره
          </li>
          <li>
            لإيقافه مؤقتاً (مثل موظف في إجازة)، استخدم زر{' '}
            <UILabel>تعطيل</UILabel>
          </li>
          <li>
            للحذف النهائي (مثل موظف ترك العمل)، استخدم زر{' '}
            <UILabel>حذف</UILabel> — لن يقدر يدخل حسابه بعدها
          </li>
        </ul>

        <Warning>
          ⚠️ عند مغادرة أي موظف للعمل، <strong>احذف حسابه فوراً</strong>. حساب
          مفتوح لموظف سابق قد يستخدمه هو أو غيره للعبث ببطاقات عملائك.
        </Warning>
      </Step>

      <Step number={5} title="أفضل الممارسات" icon={Shield}>
        <div className="space-y-3">
          <NoteCard
            emoji="🎯"
            title="كل موظف بحسابه الخاص"
            body="لا تشارك حساب واحد بين عدة موظفين — الحسابات تُسجّل كل حركة باسم صاحبها للمراجعة لاحقاً."
          />
          <NoteCard
            emoji="🔐"
            title="الحد الأدنى من الصلاحيات"
            body='أعطِ كل موظف أقل صلاحيات ممكنة. الكاشير عادةً يحتاج فقط "ماسح بطاقات الولاء".'
          />
          <NoteCard
            emoji="🔍"
            title="راجع القائمة دورياً"
            body="مرة كل شهر افتح القائمة وتأكد من أن كل المستخدمين ما زالوا موظفين فعلاً."
          />
          <NoteCard
            emoji="💡"
            title="المدير ≠ صاحب المتجر"
            body="دور المدير لا يشمل تغيير الاشتراك أو حذف المتجر — هذه يبقيها صاحب الحساب الأصلي."
          />
        </div>
      </Step>
    </div>
  )
}
