import {
  Settings,
  Palette,
  Image,
  Mail,
  MessageSquare,
  Bell,
  Globe,
  Clock,
  FileText,
  Paintbrush,
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
 * Help article: "الهوية البصرية والتكاملات"
 * Explains Settings page: branding, templates, integrations.
 */
export default function BrandingIntegrationsArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 4 دقائق" />
            <InfoChip icon={Settings} label="المستوى: متقدم" />
          </>
        }
      >
        صفحة <strong>الإعدادات</strong> هي بيت متجرك — فيها تضبط الهوية
        البصرية (الشعار، الألوان، اسم المتجر) وقوالب الرسائل التي تُرسل
        لعملائك عبر البريد والـ SMS والإشعارات. اضبطها في البداية مرة واحدة
        ستوفّر لك تعب كل مرة.
      </Intro>

      <Step number={1} title="الهوية البصرية للمتجر" icon={Paintbrush}>
        <p>
          من <UILabel>الإعدادات</UILabel> ← قسم الهوية، ستحدد:
        </p>
        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={FileText}
            title="اسم المتجر"
            details={[
              'الاسم الذي يظهر للعملاء في التطبيق والبطاقات والرسائل',
              'اختر اسماً واضحاً ومطابقاً للوحتك (مثل واجهة المحل)',
            ]}
          />
          <DetailBlock
            icon={Image}
            title="الشعار"
            details={[
              'يُفضّل صورة مربعة بدقة عالية (512×512 أو أكثر)',
              'PNG شفاف يعطي نتيجة أنظف',
              'يظهر في كل مكان: البطاقة، التطبيق، الرسائل',
            ]}
          />
          <DetailBlock
            icon={Palette}
            title="الألوان"
            details={[
              'اللون الأساسي: يُطبّق على الأزرار والبطاقات',
              'اللون الثانوي: للعناصر المساعدة',
              'اختر ألوان هوية متجرك الفعلية',
            ]}
          />
        </div>

        <Tip>
          💡 الشعار والألوان تظهر تلقائياً على البطاقات إن لم تخصّصها في
          محرر البطاقة — فابدأ بضبط الهوية العامة أولاً.
        </Tip>
      </Step>

      <Step number={2} title="قوالب الرسائل (Templates)" icon={FileText}>
        <p>
          ستامبلي يُرسل رسائل تلقائية في حالات كثيرة (عند التسجيل، عند اكتمال
          المكافأة، إلخ). من الإعدادات تقدر تخصّص محتوى هذه الرسائل لتكون
          بصوت متجرك:
        </p>

        <MockUI title="قوالب متوفرة">
          <div className="space-y-2">
            <IconRow
              icon={<Mail className="h-5 w-5" />}
              title="قوالب البريد الإلكتروني"
              desc="الترحيب، OTP، إشعار المكافأة، الفواتير"
            />
            <IconRow
              icon={<MessageSquare className="h-5 w-5" />}
              title="قوالب SMS"
              desc="رسائل قصيرة لتأكيد التسجيل، تنبيهات العروض"
            />
            <IconRow
              icon={<Bell className="h-5 w-5" />}
              title="قوالب الإشعارات (Push)"
              desc="إشعارات داخل التطبيق و Apple/Google Wallet"
            />
          </div>
        </MockUI>

        <p className="mt-4">
          كل قالب فيه متغيّرات مثل <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{'{{customer_name}}'}</code>{' '}
          و <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{'{{card_name}}'}</code> — تُعبّأ تلقائياً بمعلومات كل عميل.
        </p>
      </Step>

      <Step number={3} title="تكاملات البريد والرسائل" icon={Mail}>
        <p>
          من قسم <UILabel>التكاملات</UILabel> تقدر تربط خدمات خارجية إن
          احتجتها:
        </p>
        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={Mail}
            title="البريد الإلكتروني"
            details={[
              'افتراضياً ستامبلي يرسل من اسمه',
              'تقدر تربط مزوّد بريد خاص بك (مثل SMTP) ليرسل باسم متجرك',
              'يعطي مصداقية أكبر للرسائل',
            ]}
          />
          <DetailBlock
            icon={MessageSquare}
            title="SMS"
            details={[
              'ستامبلي يستخدم مزوّد موثوق افتراضياً',
              'لو عندك اتفاقية خاصة مع مزوّد SMS، تقدر تربطه هنا',
              'مفيد للمتاجر الكبرى ذات الأحجام العالية',
            ]}
          />
          <DetailBlock
            icon={Bell}
            title="الإشعارات (Push)"
            details={[
              'مفعّلة تلقائياً — ما تحتاج إعداد',
              'تصل فقط للعملاء اللي حمّلوا تطبيق ستامبلي ووافقوا على الإشعارات',
            ]}
          />
        </div>
      </Step>

      <Step number={4} title="اختبر كل شيء قبل النشر" icon={Globe}>
        <p>بعد ما تضبط الإعدادات:</p>
        <ol className="list-decimal ps-5 space-y-2 mt-2">
          <li>
            سجّل بطاقة بنفسك (من الرابط العام) برقم جوالك وبريدك
          </li>
          <li>تأكد أن الرسالة الترحيبية تظهر باسم متجرك وشعارك</li>
          <li>جرّب الرسائل التلقائية (من صفحة التلقائيات)</li>
          <li>شاهد البطاقة في التطبيق — هل الألوان صحيحة؟</li>
        </ol>
        <Tip>
          💡 الاختبار بنفسك يكشف الأخطاء قبل العميل الأول — خطوة واحدة توفّر
          لك إحراج كثير.
        </Tip>
      </Step>

      <Step number={5} title="نصائح عامة" icon={Settings}>
        <div className="space-y-3">
          <NoteCard
            emoji="🎨"
            title="ثبات الهوية"
            body="استخدم نفس الألوان والشعار في كل مكان — رسائل، بطاقات، فواتير، حسابات السوشيال."
          />
          <NoteCard
            emoji="✍️"
            title="الصوت الودود"
            body="اكتب قوالب الرسائل بنفس لهجة متجرك — رسمي، ودود، شبابي — يخلق ارتباط عاطفي."
          />
          <NoteCard
            emoji="🔁"
            title="راجع سنوياً"
            body="الهوية والقوالب تحتاج مراجعة مرة في السنة على الأقل — الاتجاهات تتغير."
          />
          <NoteCard
            emoji="📷"
            title="جودة الشعار"
            body="شعار مُشوّه أو منخفض الدقة يعطي انطباع سيء — استثمر 5 دقائق في شعار نظيف."
          />
        </div>
      </Step>
    </div>
  )
}
