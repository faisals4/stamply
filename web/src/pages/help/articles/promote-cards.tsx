import {
  Megaphone,
  QrCode,
  Printer,
  Camera,
  MessageCircle,
  Users,
  Store,
  Clock,
  Gift,
  Lightbulb,
} from 'lucide-react'
import {
  Step,
  Tip,
  UILabel,
  InfoChip,
  NoteCard,
  DetailBlock,
  Intro,
  IconRow,
  MockUI,
} from './_components'

/**
 * Help article: "كيف تُروّج لبطاقتك"
 * Teaches the merchant how to get customers to sign up for the card.
 */
export default function PromoteCardsArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
            <InfoChip icon={Megaphone} label="المستوى: أساسي" />
          </>
        }
      >
        البطاقة الأجمل في العالم بدون عملاء = صفر. هذا الدرس يجمع أفضل الطرق
        لتوصيل بطاقتك لعملائك وتحويل زائر لأول مرة إلى مشترك في برنامج
        الولاء.
      </Intro>

      <Step number={1} title="داخل المتجر — الأهم" icon={Store}>
        <p>أفضل عميل جديد هو من دخل متجرك للتو. هذه لحظة ذهبية:</p>

        <MockUI title="نقاط داخل المتجر">
          <div className="space-y-2">
            <IconRow
              icon={<QrCode className="h-5 w-5" />}
              title="QR على الطاولة / الكاونتر"
              desc='"امسح واحصل على قهوة مجانية بعد 6 زيارات"'
            />
            <IconRow
              icon={<Printer className="h-5 w-5" />}
              title="QR على الفاتورة"
              desc="اطبع الـ QR في كل فاتورة — يصل 100% من الزبائن"
            />
            <IconRow
              icon={<Users className="h-5 w-5" />}
              title="تذكير من الكاشير"
              desc='"عندنا بطاقة ولاء — تبي تسجّل؟ تاخذ ثانيتين"'
            />
          </div>
        </MockUI>

        <Tip>
          💡 <strong>سؤال الكاشير أهم من أي تصميم.</strong> دربه يسأل كل عميل
          جديد: "أول مرة معنا؟ تحب تسجّل في بطاقة الولاء؟" النسبة ترتفع 3
          أضعاف.
        </Tip>
      </Step>

      <Step number={2} title="السوشيال ميديا" icon={Camera}>
        <div className="space-y-3">
          <DetailBlock
            icon={Camera}
            title="انستقرام / سناب شات"
            details={[
              'منشور بستوري يعرف العملاء بالبطاقة',
              'ضع الرابط في البايو',
              'فيديو قصير يشرح: "اجمع 6 أختام = قهوة مجانية"',
              'كرر الإعلان شهرياً لجمهورك الجديد',
            ]}
          />
          <DetailBlock
            icon={MessageCircle}
            title="واتساب"
            details={[
              'أرسل الرابط في قائمة عملائك',
              'ضع الرابط في حالة الواتساب الأعمال',
              'رسالة خاصة لعملائك الذين عندك أرقامهم',
            ]}
          />
        </div>
      </Step>

      <Step number={3} title="اجعل الحافز قوياً" icon={Gift}>
        <p>
          سبب تردد العميل عادةً = ما يشوف قيمة كافية. قوّي العرض:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>
            <strong>ختم ترحيبي مجاني</strong> — "سجّل واحصل على ختم هدية فوراً"
            (فعّلها من صفحة التلقائيات)
          </li>
          <li>
            <strong>مكافأة قريبة</strong> — 5-6 أختام أفضل من 10+ للبداية
          </li>
          <li>
            <strong>مكافأة واضحة</strong> — "قهوة مجانية" أوضح من "خصم 25%"
          </li>
        </ul>
      </Step>

      <Step number={4} title="الطباعة المادية" icon={Printer}>
        <p>العناصر المطبوعة التي تستحق الاستثمار:</p>

        <div className="space-y-3 mt-3">
          <NoteCard
            emoji="🪧"
            title="ستاند على الكاونتر"
            body='ستاند A5 أو A4 فيه QR كبير ورسالة واضحة: "امسح، اجمع، اشرب مجاناً".'
          />
          <NoteCard
            emoji="📇"
            title="كارت على الطاولة"
            body="كارت صغير مع QR على كل طاولة — العميل يمسح وهو ينتظر الطلب."
          />
          <NoteCard
            emoji="🧾"
            title="الفاتورة"
            body="أضف الـ QR في أسفل الفاتورة مع جملة ترويجية. يصل لكل عميل بدون تكلفة إضافية."
          />
          <NoteCard
            emoji="🏷️"
            title="ملصق على الباب"
            body='"متجر رقمي — بطاقة ولاء بدون تطبيق" يلفت العابرين.'
          />
        </div>
      </Step>

      <Step number={5} title="اسأل سؤالاً واحداً" icon={Lightbulb}>
        <p>
          سر النسبة العالية للتسجيل = تدريب الكاشير على سؤال بسيط في اللحظة
          المناسبة:
        </p>
        <div className="rounded-lg bg-primary/5 border-s-4 border-primary p-4 mt-3">
          <div className="text-sm font-bold text-primary mb-2">السيناريو المثالي:</div>
          <ol className="list-decimal ps-5 space-y-1 text-sm text-foreground/80">
            <li>العميل سلّم الدفعة وينتظر طلبه</li>
            <li>الكاشير: "عميلنا لأول مرة؟ نسجّلك في بطاقة الولاء؟ ثانيتين"</li>
            <li>يمسح العميل QR على الكاونتر</li>
            <li>يدخل رقمه، يصله OTP، يؤكد</li>
            <li>الكاشير يضيف الختم الأول مباشرة</li>
          </ol>
        </div>
        <Tip>
          💡 النسبة الطبيعية لتسجيل عملاء جدد مع كاشير مدرّب: <strong>60-80%</strong>.
          بدون تدريب: <strong>5-15%</strong>. الفرق كبير.
        </Tip>
      </Step>

      <Step number={6} title="قِس ومحسّن" icon={Megaphone}>
        <p>
          افتح صفحة <UILabel>التقارير</UILabel> أسبوعياً وراقب:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>كم عميل سجّل هذا الأسبوع؟</li>
          <li>كم نسبتهم من إجمالي الزبائن (قارن بعدد الفواتير)</li>
          <li>أي يوم سجّل الأكثر؟ (ساعة الذروة؟)</li>
        </ul>

        <div className="space-y-3 mt-4">
          <NoteCard
            emoji="📊"
            title="هدف معقول"
            body="60% من الزبائن الجدد يسجّلون = ممتاز. 30% = مقبول. أقل من 20% = الكاشير ما يسأل."
          />
          <NoteCard
            emoji="🔁"
            title="جرّب شيء جديد كل أسبوع"
            body="غيّر مكان QR، غيّر صيغة سؤال الكاشير، جرّب حافز ترحيبي. قِس الفرق."
          />
        </div>
      </Step>
    </div>
  )
}
