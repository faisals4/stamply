import {
  Megaphone,
  Smartphone,
  Clock,
  Bell,
  Eye,
  Send,
  AlertTriangle,
  Target,
  Calendar,
  Zap,
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
 * Help article: "إعلانات Apple & Google Wallet"
 * Explains the wallet lock-screen announcement feature.
 */
export default function WalletAnnouncementsArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
            <InfoChip icon={Megaphone} label="المستوى: متقدم" />
          </>
        }
      >
        ميزة فريدة: إعلانات <strong>Apple & Google Wallet</strong> تسمح لك
        بإيصال رسالة قصيرة تظهر على البطاقة في محفظة العميل الرقمية — حتى
        وهو ما يفتح التطبيق. هذا من أقوى قنوات التواصل لأن العميل يشاهدها
        كل مرة يفتح جواله.
      </Intro>

      <Step number={1} title="لماذا هذه الميزة مختلفة؟" icon={Smartphone}>
        <p>
          الإعلان على البطاقة في المحفظة الرقمية يختلف عن SMS أو إشعار عادي:
        </p>
        <ul className="list-disc ps-5 space-y-2 mt-2">
          <li>يظهر <strong>خلف</strong> البطاقة كملاحظة دائمة حتى تحدّث الإعلان</li>
          <li>يُذكّر العميل كل مرة يفتح بطاقته</li>
          <li>لا يكلّفك شيئاً (مجاني، غير SMS)</li>
          <li>يصل لكل من أضاف البطاقة في المحفظة</li>
        </ul>
      </Step>

      <Step number={2} title="افتح صفحة إعلانات المحفظة" icon={Megaphone}>
        <p>
          من القائمة الجانبية اضغط <UILabel>إعلانات المحفظة</UILabel>. ستجد
          قائمة بالإعلانات السابقة وزر{' '}
          <InlineButton icon={Send}>+ إعلان جديد</InlineButton>.
        </p>
      </Step>

      <Step number={3} title="اكتب محتوى الإعلان" icon={Eye}>
        <p>
          الإعلان قصير جداً — يكفيه جملة أو اثنتين. مثل:
        </p>

        <MockUI title="أمثلة نصوص الإعلان">
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <div className="text-[11px] text-muted-foreground mb-1">عرض موسمي</div>
              <div className="text-sm font-medium">
                "خصم 20% على كل الطلبات حتى نهاية الأسبوع ☕"
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <div className="text-[11px] text-muted-foreground mb-1">منتج جديد</div>
              <div className="text-sm font-medium">
                "جرّب قهوتنا الجديدة — برازيل شانتال 🇧🇷"
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <div className="text-[11px] text-muted-foreground mb-1">تذكير</div>
              <div className="text-sm font-medium">
                "مكافأتك في انتظارك — تعال استبدلها اليوم 🎁"
              </div>
            </div>
          </div>
        </MockUI>

        <Tip>
          💡 اجعل الإعلان <strong>محدد بزمن</strong> وفيه دعوة واضحة (قم،
          تعال، جرّب). العموميات تُتجاهل.
        </Tip>
      </Step>

      <Step number={4} title="اختر الجمهور والبطاقة" icon={Target}>
        <div className="space-y-3">
          <DetailBlock
            icon={Target}
            title="البطاقة المستهدفة"
            details={[
              'الإعلان يظهر على بطاقة واحدة — اختر أيها',
              'كل من أضاف البطاقة في محفظته سيشاهده',
              'لو عندك أكثر من بطاقة، كرر الإعلان لكل واحدة (إن أردت)',
            ]}
          />
          <DetailBlock
            icon={Calendar}
            title="مدة العرض"
            details={[
              'تقدر تحدد مدة ظهور الإعلان (مثل 7 أيام)',
              'بعد انتهاء المدة يُخفى تلقائياً',
              'أو تتركه دائم وتستبدله بإعلان جديد لاحقاً',
            ]}
          />
        </div>
      </Step>

      <Step number={5} title="عاين وأرسل" icon={Send}>
        <ol className="list-decimal ps-5 space-y-2">
          <li>
            اضغط <UILabel>معاينة</UILabel> لتشوف شكل الإعلان في iPhone Wallet
            وفي Google Wallet
          </li>
          <li>تأكد من النص خالٍ من الأخطاء الإملائية</li>
          <li>
            اضغط <InlineButton icon={Send}>نشر</InlineButton>
          </li>
          <li>
            الإعلان يصل خلال دقائق لكل العملاء الذين أضافوا البطاقة في المحفظة
          </li>
        </ol>
        <Warning>
          ⚠️ الإعلان يذهب لجميع حاملي البطاقة دفعة واحدة — راجع قبل النشر.
          ولا تنشر أكثر من مرة يومياً وإلا العميل يحذف البطاقة.
        </Warning>
      </Step>

      <Step number={6} title="استخدامات ذكية" icon={Zap}>
        <div className="space-y-3">
          <NoteCard
            emoji="🎯"
            title="عرض اليوم"
            body='استخدم الإعلان صباحاً ليعرف العملاء عرض اليوم ("قهوة + كرواسون = 20 ريال حتى 4 عصراً").'
          />
          <NoteCard
            emoji="🆕"
            title="إطلاق منتج"
            body="عند إضافة منتج جديد للقائمة، أعلن عنه للحاملين — هؤلاء أوفى عملائك."
          />
          <NoteCard
            emoji="⏰"
            title="تذكير نهاية الأسبوع"
            body="كل خميس/جمعة ضع إعلان يذكّر العميل بمكافأته القريبة — يرفع الزيارات 20-30%."
          />
          <NoteCard
            emoji="🎉"
            title="مناسبات خاصة"
            body="عيد وطني، رمضان، ذكرى افتتاح المتجر — ذكّر العميل بعرض مناسب."
          />
        </div>
      </Step>
    </div>
  )
}
