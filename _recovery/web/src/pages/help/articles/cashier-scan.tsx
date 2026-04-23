import {
  ScanLine,
  Search,
  Plus,
  Minus,
  Gift,
  Clock,
  AlertTriangle,
  Users,
  QrCode,
  CheckCircle2,
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
  MockUI,
} from './_components'

/**
 * Help article: "استخدام ماسح بطاقات الولاء"
 * Teaches the merchant / cashier how to look up a customer card,
 * add stamps, remove stamps by mistake, and redeem rewards.
 */
export default function CashierScanArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      <Intro
        chips={
          <>
            <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
            <InfoChip icon={ScanLine} label="المستوى: يومي / أساسي" />
          </>
        }
      >
        ماسح بطاقات الولاء هو أهم صفحة يستخدمها الكاشير يومياً — من خلالها
        يضيف الأختام للعملاء، يصرف المكافآت، ويصحح الأخطاء. هذا الدرس يشرح
        كل شيء عن صفحة <strong>ماسح بطاقات الولاء</strong>.
      </Intro>

      <Step number={1} title="افتح صفحة الماسح" icon={ScanLine}>
        <p>
          من القائمة الجانبية، اضغط على{' '}
          <UILabel>ماسح بطاقات الولاء</UILabel>.
        </p>
        <p>
          ستظهر لك صفحة بسيطة فيها خانة بحث تدخل فيها الرقم التسلسلي للبطاقة
          أو تمسح رمز QR من تطبيق العميل.
        </p>
        <Tip>
          💡 افتح هذه الصفحة على جهاز الكاشير مباشرة — يفضّل تثبيتها كاختصار
          على المتصفح ليفتحها بضغطة واحدة.
        </Tip>
      </Step>

      <Step number={2} title="ابحث عن بطاقة العميل" icon={Search}>
        <p>عندك طريقتان للبحث عن بطاقة العميل:</p>
        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={QrCode}
            title="مسح رمز QR"
            details={[
              'اطلب من العميل فتح بطاقته في تطبيق ستامبلي أو في Apple/Google Wallet',
              'رمز QR يظهر على البطاقة',
              'امسحه بكاميرا جهاز الكاشير أو انسخ الرقم التسلسلي يدوياً',
            ]}
          />
          <DetailBlock
            icon={Search}
            title="إدخال الرقم التسلسلي"
            details={[
              'كل بطاقة لها رقم تسلسلي فريد (serial number)',
              'أدخل الرقم في خانة البحث واضغط Enter',
              'ستظهر البطاقة مع حالة الأختام الحالية',
            ]}
          />
        </div>
        <Warning>
          ⚠️ إذا ظهرت رسالة <strong>"البطاقة غير موجودة"</strong>، تأكد من
          الرقم — أحياناً يكون الخطأ حرف واحد. لو استمر الخطأ، اطلب من العميل
          تسجيل بطاقة جديدة.
        </Warning>
      </Step>

      <Step number={3} title="أضف الأختام للعميل" icon={Plus}>
        <p>
          بعد ما تظهر البطاقة، ستشاهد شكلها وعدد الأختام الحالي. لإضافة ختم:
        </p>
        <ol className="list-decimal ps-5 space-y-2 mt-2">
          <li>
            اضغط زر <InlineButton icon={Plus}>+ إضافة ختم</InlineButton>
          </li>
          <li>
            يمكنك زيادة الرقم قبل الضغط لإضافة أكثر من ختم دفعة واحدة (مثلاً
            لو العميل طلب أكثر من قهوة)
          </li>
          <li>الختم ينعكس فوراً في بطاقة العميل وفي Apple/Google Wallet</li>
          <li>يظهر لك إشعار <strong>"تم إضافة الطابع ✓"</strong></li>
        </ol>
        <Tip>
          💡 لو أضفت ختم بالخطأ — لا داعي للقلق. اضغط{' '}
          <InlineButton icon={Minus}>− خصم ختم</InlineButton> فوراً ليُلغى.
        </Tip>
      </Step>

      <Step number={4} title="اصرف المكافأة للعميل" icon={Gift}>
        <p>
          عند اكتمال عدد الأختام المطلوب، سيظهر زر المكافأة بشكل مميز:
        </p>
        <MockUI title="حالة البطاقة عند اكتمال المكافأة">
          <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6 text-primary" />
              <div>
                <div className="font-bold text-sm">قهوة مجانية</div>
                <div className="text-xs text-muted-foreground">
                  جاهزة للصرف
                </div>
              </div>
            </div>
            <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white">
              صرف المكافأة
            </span>
          </div>
        </MockUI>
        <ol className="list-decimal ps-5 space-y-2 mt-4">
          <li>اضغط زر <InlineButton icon={Gift}>صرف المكافأة</InlineButton></li>
          <li>سلّم العميل مكافأته (قهوة، خصم، أو ما حدّدته في البطاقة)</li>
          <li>البطاقة تبدأ دورة جديدة تلقائياً من الصفر</li>
        </ol>
        <Warning>
          ⚠️ <strong>لا تصرف المكافأة قبل الضغط على الزر</strong> — بدون الضغط،
          النظام يعتبر المكافأة ما صُرفت وستظل جاهزة في البطاقة.
        </Warning>
      </Step>

      <Step number={5} title="نصائح للكاشير" icon={Users}>
        <div className="space-y-3">
          <NoteCard
            emoji="⚡"
            title="السرعة أهم من الدقة الزائدة"
            body="اجعل العملية تأخذ أقل من 10 ثواني — العميل في طابور لا يحب الانتظار."
          />
          <NoteCard
            emoji="👀"
            title="تحقق بسرعة من اسم العميل"
            body="اسم العميل يظهر مع البطاقة — تأكد أنها بطاقة الشخص الصحيح، خاصة لو في ازدحام."
          />
          <NoteCard
            emoji="🔁"
            title="التعديل ممكن"
            body="لو أضفت أو خصمت ختم بالغلط، يمكنك تصحيحه فوراً بزر + أو − في نفس الشاشة."
          />
          <NoteCard
            emoji="🔐"
            title="كل صرف مسجّل"
            body="كل إضافة ختم أو صرف مكافأة تُسجّل باسم المستخدم الذي قام بها — لأمانك وأمان متجرك."
          />
        </div>
      </Step>

      <Step number={6} title="أسئلة شائعة" icon={AlertTriangle}>
        <div className="space-y-3">
          <NoteCard
            emoji="❓"
            title="ماذا لو نسي العميل جواله؟"
            body="اطلب منه رقم جواله، ابحث عنه من صفحة العملاء، وستجد بطاقته وتضيف الختم يدوياً."
          />
          <NoteCard
            emoji="❓"
            title="هل أحتاج إنترنت؟"
            body="نعم — الماسح يحتاج اتصال إنترنت ليحدّث البطاقة فوراً في السحابة."
          />
          <NoteCard
            emoji="❓"
            title="هل يمكن لأكثر من كاشير يستخدم الماسح؟"
            body="نعم — كل مستخدم تضيفه من صفحة المستخدمون يقدر يفتح الماسح بحسابه."
          />
          <NoteCard
            emoji="❓"
            title="هل تعمل مع أكثر من بطاقة؟"
            body="نعم — إذا عندك بطاقات متعددة (قهوة، حلى، …)، الماسح يعرض كل بطاقات العميل وتختار التي تضيف لها ختم."
          />
        </div>
      </Step>
    </div>
  )
}
