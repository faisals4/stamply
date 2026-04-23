import {
  MapPin,
  Plus,
  Map,
  Navigation,
  Clock,
  Building2,
  Phone,
  Globe,
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
 * Help article: "إدارة المواقع (الفروع)"
 * Explains how to add branches, geofencing, location-specific features.
 */
export default function LocationsArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
            <InfoChip icon={MapPin} label="المستوى: مبتدئ" />
          </>
        }
      >
        صفحة <strong>المواقع</strong> تسمح لك بإضافة فروع متجرك — كل فرع
        بعنوانه ومواعيده وإحداثياته. هذا يفيدك في أكثر من مكان: يظهر
        العملاء أقرب فرع لهم، وتتبّع الأداء حسب الفرع، وتفعّل عروض محلية.
      </Intro>

      <Step number={1} title="متى تحتاج أكثر من موقع؟" icon={Building2}>
        <ul className="list-disc ps-5 space-y-2">
          <li>إذا عندك أكثر من فرع في مدينة أو مدن مختلفة</li>
          <li>إذا تريد معرفة أي فرع يبيع أكثر ويحقّق مكافآت أكثر</li>
          <li>إذا تريد تفعيل ختم تلقائي عند دخول العميل نطاق الفرع (geofencing)</li>
          <li>إذا تعرض البطاقة للعملاء في تطبيق ستامبلي — ليشوفوا أقرب فرع</li>
        </ul>
        <Tip>
          💡 لو عندك فرع واحد فقط، كذلك ضيفه — سيظهر على خريطة متجرك للعملاء
          الجدد في التطبيق.
        </Tip>
      </Step>

      <Step number={2} title="أضف فرع جديد" icon={Plus}>
        <ol className="list-decimal ps-5 space-y-2">
          <li>
            من القائمة الجانبية اضغط <UILabel>المواقع</UILabel>
          </li>
          <li>
            اضغط <InlineButton icon={Plus}>+ إضافة موقع</InlineButton>
          </li>
          <li>املأ المعلومات الأساسية للفرع</li>
          <li>اضغط <UILabel>حفظ</UILabel></li>
        </ol>
      </Step>

      <Step number={3} title="الحقول المطلوبة" icon={MapPin}>
        <div className="space-y-3">
          <DetailBlock
            icon={Building2}
            title="اسم الفرع"
            details={[
              'اسم واضح يعرفه العملاء (مثل: "فرع الملك فهد"، "فرع العليا")',
              'تجنّب الأسماء الفنية الداخلية',
            ]}
          />
          <DetailBlock
            icon={Map}
            title="العنوان والإحداثيات"
            details={[
              'عنوان نصي للفرع (الحي، الشارع)',
              'الإحداثيات من خرائط جوجل (latitude, longitude)',
              'يمكنك نسخها من Google Maps بالضغط المطوّل على الموقع',
            ]}
          />
          <DetailBlock
            icon={Phone}
            title="معلومات الاتصال (اختياري)"
            details={[
              'رقم الجوال أو الأرضي للفرع',
              'رابط جوجل بزنس أو انستقرام الفرع',
              'مواعيد العمل',
            ]}
          />
        </div>
      </Step>

      <Step number={4} title="النطاق الجغرافي (Geofencing)" icon={Navigation}>
        <p>
          ميزة متقدمة: حدّد نطاق حول الفرع (مثلاً 100 متر) ليفعّل النظام
          خصائص إضافية عند دخول العميل النطاق:
        </p>

        <MockUI title="مزايا النطاق الجغرافي">
          <div className="space-y-2">
            <IconRow
              icon={<Navigation className="h-5 w-5" />}
              title="تنبيه Apple/Google Wallet"
              desc="البطاقة تظهر تلقائياً في شاشة القفل لما يقترب العميل"
            />
            <IconRow
              icon={<Clock className="h-5 w-5" />}
              title="إشعار ترحيب"
              desc="رسالة تلقائية للعميل عند دخوله الفرع"
            />
          </div>
        </MockUI>

        <Tip>
          💡 نطاق 100-200 متر حول الفرع عادةً مناسب. نطاق أوسع يسبب تنبيهات
          كثيرة، ونطاق أضيق قد لا يلتقط العميل.
        </Tip>
      </Step>

      <Step number={5} title="تعديل أو إيقاف موقع" icon={MapPin}>
        <ul className="list-disc ps-5 space-y-2">
          <li>
            تقدر تعدّل بيانات الفرع في أي وقت من قائمة المواقع
          </li>
          <li>
            لإيقاف فرع (مثلاً مغلق للصيانة) — استخدم زر{' '}
            <UILabel>تعطيل</UILabel> بدل الحذف
          </li>
          <li>الحذف نهائي — استخدمه فقط للفروع المغلقة دائماً</li>
        </ul>

        <div className="space-y-3 mt-4">
          <NoteCard
            emoji="🗺️"
            title="الخرائط للعملاء"
            body="العميل في التطبيق يشوف كل فروعك على خريطة ويختار الأقرب."
          />
          <NoteCard
            emoji="📊"
            title="تقارير حسب الفرع"
            body="صفحة التقارير تسمح لك بفلترة الأختام والمكافآت لكل فرع على حدة."
          />
          <NoteCard
            emoji="👥"
            title="اربط كاشير بفرع"
            body="من صفحة المستخدمون، تقدر تحدد أي فرع يقدر كل كاشير يشتغل فيه."
          />
        </div>
      </Step>
    </div>
  )
}
