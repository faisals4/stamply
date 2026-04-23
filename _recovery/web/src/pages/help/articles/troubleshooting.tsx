import {
  AlertTriangle,
  Wifi,
  Smartphone,
  Search,
  RefreshCw,
  HelpCircle,
  Clock,
  Bell,
  CreditCard,
  Wallet,
  Mail,
  MessageSquare,
} from 'lucide-react'
import {
  Step,
  Tip,
  Warning,
  UILabel,
  InfoChip,
  NoteCard,
  DetailBlock,
  Intro,
} from './_components'

/**
 * Help article: "حل المشاكل الشائعة"
 * FAQ-style troubleshooting for common merchant issues.
 */
export default function TroubleshootingArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 4 دقائق" />
            <InfoChip icon={AlertTriangle} label="المستوى: مرجعي" />
          </>
        }
      >
        أغلب المشاكل لها حلول بسيطة. هذا الدرس يجمع أكثر الأسئلة التي تأتي
        من التجار مع حلولها المباشرة. احفظ الصفحة كمرجع سريع عند أي موقف.
      </Intro>

      <Step number={1} title="ماسح البطاقات" icon={Search}>
        <div className="space-y-3">
          <DetailBlock
            icon={Search}
            title="البطاقة غير موجودة"
            details={[
              'تأكد من الرقم التسلسلي حرف بحرف',
              'جرّب نسخه من بطاقة العميل في التطبيق مباشرة',
              'لو مسحت QR، تأكد أن الكاميرا نظيفة والإضاءة كافية',
              'لو استمر الخطأ، احتمال العميل ما أتمّ التسجيل — اطلب منه يفتح بطاقته',
            ]}
          />
          <DetailBlock
            icon={Wifi}
            title="الماسح لا يستجيب / يُظهر دوران"
            details={[
              'تحقق من اتصال الإنترنت',
              'حدّث الصفحة (F5)',
              'لو استمر، حاول متصفح آخر أو جهاز آخر',
            ]}
          />
          <DetailBlock
            icon={RefreshCw}
            title='"تم إضافة ختم" لكن لا يظهر للعميل'
            details={[
              'اطلب من العميل تحديث بطاقته في التطبيق (سحب للأسفل)',
              'لو في Apple/Google Wallet، التحديث تلقائي خلال ثوانٍ',
              'تأكد أن العميل عنده إنترنت',
            ]}
          />
        </div>
      </Step>

      <Step number={2} title="البطاقات والعملاء" icon={CreditCard}>
        <div className="space-y-3">
          <DetailBlock
            icon={CreditCard}
            title="لا أقدر أنشئ بطاقة جديدة"
            details={[
              'قد تكون وصلت حد عدد البطاقات في خطتك',
              'افتح صفحة الاشتراك لترى عدد البطاقات المستخدمة',
              'الحل: احذف بطاقة قديمة غير مستخدمة، أو رقِّ الخطة',
            ]}
          />
          <DetailBlock
            icon={CreditCard}
            title="عدّلت البطاقة ولكن العميل يشوف القديم"
            details={[
              'التعديلات تنعكس خلال دقائق',
              'العملاء في Apple/Google Wallet يحتاجون فتح البطاقة ليتحدّث',
              'تعديل الألوان والمكافأة ينعكس فوراً، لكن بعض التغييرات الهيكلية قد تأخذ دقائق',
            ]}
          />
          <DetailBlock
            icon={HelpCircle}
            title="عميل يقول ما وصله OTP"
            details={[
              'تأكد من الرقم صحيح ويبدأ بـ 5 (للسعودية)',
              'اطلب منه التحقق من خانة البريد العشوائي لو يسجّل بالإيميل',
              'جرّب إعادة الإرسال بعد 60 ثانية',
              'لو استمر، تواصل مع دعم ستامبلي',
            ]}
          />
        </div>
      </Step>

      <Step number={3} title="Apple & Google Wallet" icon={Wallet}>
        <div className="space-y-3">
          <DetailBlock
            icon={Wallet}
            title={`لا تظهر أيقونة "إضافة للمحفظة"`}
            details={[
              'Apple Wallet: يعمل فقط على iPhone بنظام iOS 10 فما فوق',
              'Google Wallet: يحتاج تطبيق Google Wallet مثبّت على الأندرويد',
              'بعض المتصفحات (مثل متصفح مدمج داخل تطبيق آخر) تمنع الميزة — افتح الرابط في Safari أو Chrome',
            ]}
          />
          <DetailBlock
            icon={Bell}
            title="البطاقة في المحفظة لا تتحدّث"
            details={[
              'التحديث يتطلب اتصال إنترنت',
              'على iPhone: افتح البطاقة، اسحب للأسفل لتحديث يدوي',
              'تحقق من تفعيل "التحديث التلقائي" في إعدادات Apple Wallet',
            ]}
          />
        </div>
      </Step>

      <Step number={4} title="الرسائل والإشعارات" icon={MessageSquare}>
        <div className="space-y-3">
          <DetailBlock
            icon={MessageSquare}
            title="SMS لم يصل للعميل"
            details={[
              'تأكد أن الرقم صحيح (بصيغة 5XXXXXXXX للسعودية)',
              'بعض شركات الاتصال تأخر رسائل دقائق',
              'تحقق من رصيد باقة SMS في اشتراكك',
              'افتح الرسالة من صفحة الرسائل لترى حالة الإرسال لكل عميل',
            ]}
          />
          <DetailBlock
            icon={Mail}
            title="البريد ينتهي في الـ Spam"
            details={[
              'اطلب من العميل إضافة عنوانك في جهات الاتصال',
              'استخدم مزوّد بريد خاص (SMTP) بدل الافتراضي — مصداقيته أعلى',
              'تجنّب كلمات مثل "مجاني!!!" أو رموز كثيرة في العنوان',
            ]}
          />
          <DetailBlock
            icon={Bell}
            title="إشعارات Push لا تصل"
            details={[
              'العميل لازم يكون حمّل تطبيق ستامبلي',
              'لازم وافق على الإشعارات عند أول تشغيل',
              'تحقق من إعدادات جواله — بعض العملاء يعطّلون الإشعارات من إعدادات الهاتف',
            ]}
          />
        </div>
      </Step>

      <Step number={5} title="لوحة التحكم والدخول" icon={AlertTriangle}>
        <div className="space-y-3">
          <DetailBlock
            icon={HelpCircle}
            title="نسيت كلمة المرور"
            details={[
              'من صفحة تسجيل الدخول، اضغط "نسيت كلمة المرور"',
              'ستصلك رسالة OTP على جوالك المسجّل',
              'لو ما وصلت، تواصل مع مدير الحساب ليعيد إرسالها من قائمة المستخدمين',
            ]}
          />
          <DetailBlock
            icon={HelpCircle}
            title='صفحة معيّنة تظهر "لا صلاحيات"'
            details={[
              'دورك لا يسمح بالوصول لهذه الصفحة',
              'تواصل مع صاحب المتجر ليضبط صلاحياتك',
              'مثلاً: الكاشير لا يدخل صفحة التقارير افتراضياً',
            ]}
          />
          <DetailBlock
            icon={RefreshCw}
            title="الصفحة بطيئة أو تتجمّد"
            details={[
              'حدّث الصفحة',
              'امسح الكاش (Cache) من إعدادات المتصفح',
              'جرّب متصفح Chrome الأخير — هو الأفضل لوحة التحكم',
            ]}
          />
        </div>
      </Step>

      <Step number={6} title="متى تطلب الدعم؟" icon={HelpCircle}>
        <p>
          لو جربت الحلول أعلاه ولم تحلّ مشكلتك، تواصل مع دعم ستامبلي مع
          المعلومات التالية:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>اسم متجرك ورقم جوال الحساب</li>
          <li>وصف المشكلة بالتفصيل</li>
          <li>رقم البطاقة / اسم العميل المتأثر (إن وُجد)</li>
          <li>لقطة شاشة للخطأ إن أمكن</li>
          <li>وقت حدوث المشكلة التقريبي</li>
        </ul>

        <Tip>
          💡 <strong>99% من المشاكل</strong> حلها بسيط — حدّث الصفحة، راجع
          الإنترنت، تأكد من الرقم. قبل أي شيء جرّب هذه الخطوات الثلاث.
        </Tip>

        <div className="space-y-3 mt-4">
          <NoteCard
            emoji="📞"
            title="أوقات الدعم"
            body="فريق الدعم متاح في أيام العمل. الرد عادةً خلال ساعات قليلة."
          />
          <NoteCard
            emoji="🔍"
            title="قبل التواصل"
            body="تأكد من أنك قرأت المقال المناسب في مركز المساعدة — أغلب الإجابات موجودة هنا."
          />
        </div>
      </Step>
    </div>
  )
}
