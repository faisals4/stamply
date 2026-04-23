import {
  CreditCard,
  Palette,
  Settings,
  Share2,
  Lightbulb,
  Plus,
  MousePointerClick,
  Stamp,
  Gift,
  Image,
  Bell,
  Clock,
  Link2,
  QrCode,
  Smartphone,
  Wallet,
  PenLine,
} from 'lucide-react'

/**
 * Help article: "كيف تضيف بطاقة جديدة"
 *
 * Detailed step-by-step walkthrough with visual UI mockups that
 * mirror the real admin interface. Uses HTML/CSS instead of
 * screenshots so the article stays accurate across UI updates.
 */
export default function AddNewCardArticle() {
  return (
    <div className="space-y-8 text-[15px] leading-relaxed">
      {/* ─── Introduction ─── */}
      <div className="rounded-xl bg-primary/5 p-6 border border-primary/10">
        <p className="text-base text-foreground/80">
          بطاقة الولاء هي أساس نظام ستامبلي — العميل يجمع أختاماً عند كل زيارة
          ويستبدلها بمكافآت تحددها أنت. هذا الدرس يشرح خطوة بخطوة كيف تنشئ
          أول بطاقة وتنشرها لعملائك.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <InfoChip icon={Clock} label="مدة القراءة: 3 دقائق" />
          <InfoChip icon={CreditCard} label="المستوى: مبتدئ" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Step 1 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Step number={1} title="افتح صفحة البطاقات" icon={MousePointerClick}>
        <p>
          بعد تسجيل الدخول إلى لوحة التحكم الخاصة بمتجرك:
        </p>

        <Screenshot src="/help/sidebar.png" alt="القائمة الجانبية — اضغط على البطاقات" />

        <ol className="list-decimal ps-5 space-y-3 mt-4">
          <li>
            من <strong>القائمة الجانبية</strong> على اليمين، اضغط على{' '}
            <UILabel>البطاقات</UILabel>
          </li>
          <li>
            ستظهر لك قائمة البطاقات الموجودة (فارغة إذا أول مرة)
          </li>
          <li>
            اضغط على الزر{' '}
            <InlineButton icon={Plus}>+ إنشاء بطاقة</InlineButton>{' '}
            في أعلى الصفحة
          </li>
        </ol>

        <Screenshot src="/help/cards-list.png" alt="صفحة البطاقات مع زر إنشاء بطاقة" />
      </Step>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Step 2 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Step number={2} title="أدخل المعلومات الأساسية" icon={PenLine}>
        <p>
          ستفتح صفحة محرر البطاقة. في التبويب الأول{' '}
          <UILabel>الإعدادات</UILabel>{' '}
          ستجد الحقول الأساسية:
        </p>

        <Screenshot src="/help/editor.png" alt="محرر البطاقة — نوع البطاقة والإعدادات" />

        <div className="space-y-3 mt-4">
          <DetailBlock
            icon={Stamp}
            title="عدد الأختام"
            details={[
              'اختر رقم مناسب (6-12 هو الأكثر شيوعاً للمقاهي)',
              'رقم صغير جداً (3-4) يعني مكافآت متكررة لكن قيمتها أقل',
              'رقم كبير (15+) يعني مكافأة أكبر لكن العميل قد يفقد الحماس',
            ]}
          />
          <DetailBlock
            icon={Gift}
            title="المكافأة"
            details={[
              'اكتب وصفاً واضحاً مثل: "قهوة مجانية" أو "خصم 50% على الطلب"',
              'يمكنك إضافة أكثر من مكافأة بمراحل — مثلاً: عند 5 أختام حلى مجاني، وعند 10 قهوة مجانية',
              'المكافأة تظهر للعميل في بطاقته وفي Apple/Google Wallet',
            ]}
          />
        </div>

        <Tip>
          💡 <strong>نصيحة ذهبية:</strong> اجعل المكافأة الأولى سهلة الوصول (5 أختام مثلاً)
          حتى يشعر العميل بالإنجاز بسرعة ويستمر في العودة.
        </Tip>
      </Step>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Step 3 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Step number={3} title="خصّص تصميم البطاقة" icon={Palette}>
        <p>
          انتقل لتبويب <UILabel>التصميم</UILabel> لتخصيص شكل البطاقة:
        </p>

        {/* Visual: Design options mockup */}
        <MockUI title="خيارات التصميم">
          <div className="grid grid-cols-2 gap-3">
            <DesignOption
              icon={<Palette className="h-4 w-4" />}
              title="لون البطاقة"
              desc="اختر لوناً يمثّل هوية متجرك"
            />
            <DesignOption
              icon={<Image className="h-4 w-4" />}
              title="شعار المتجر"
              desc="ارفع شعارك (PNG / JPG)"
            />
            <DesignOption
              icon={<Stamp className="h-4 w-4" />}
              title="شكل الختم"
              desc="قهوة، نجمة، قلب، أو مخصص"
            />
            <DesignOption
              icon={<CreditCard className="h-4 w-4" />}
              title="خلفية البطاقة"
              desc="صورة خلفية أو لون صلب"
            />
          </div>
        </MockUI>

        <ul className="list-disc ps-5 space-y-2 mt-4">
          <li>
            <strong>اللون الأساسي</strong> يُطبّق على خلفية البطاقة والأختام النشطة
          </li>
          <li>
            <strong>الشعار</strong> يظهر في أعلى البطاقة — يُفضّل صورة مربعة بدقة عالية
          </li>
          <li>
            <strong>المعاينة الحية</strong> تظهر على الجانب الأيسر — كل تعديل تسويه ينعكس فوراً
          </li>
        </ul>

        <Tip>
          💡 جرّب أكثر من مجموعة ألوان قبل ما تقرر — المعاينة تتحدّث لحظياً.
          اللون الغامق مع شعار أبيض عادةً يعطي نتيجة أنيقة.
        </Tip>
      </Step>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Step 4 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Step number={4} title="أضف إعدادات إضافية (اختياري)" icon={Settings}>
        <p>
          هذه الإعدادات <strong>اختيارية</strong> — تقدر تتخطاها وتضيفها لاحقاً
          بعد النشر:
        </p>

        <div className="space-y-3 mt-3">
          <DetailBlock
            icon={Clock}
            title="تاريخ الانتهاء"
            details={[
              'حدد مدة صلاحية البطاقة (مثلاً: 6 أشهر أو سنة)',
              'بعد انتهاء الصلاحية، البطاقة تُعطَّل تلقائياً',
              'يمكنك تركها بدون انتهاء لبطاقة دائمة',
            ]}
          />
          <DetailBlock
            icon={Bell}
            title="الإشعارات التلقائية"
            details={[
              'إرسال تنبيه للعميل عند اقتراب المكافأة ("باقي ختمين!")',
              'تنبيه عند اكتمال البطاقة وجاهزية المكافأة',
              'رسالة ترحيبية عند أول اشتراك في البطاقة',
              'تُرسل عبر التطبيق + Apple/Google Wallet تلقائياً',
            ]}
          />
        </div>
      </Step>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Step 5 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Step number={5} title="انشر البطاقة وشاركها مع عملائك" icon={Share2}>
        <ol className="list-decimal ps-5 space-y-3">
          <li>
            اضغط زر{' '}
            <InlineButton icon={Share2}>نشر البطاقة</InlineButton>{' '}
            في أعلى الصفحة
          </li>
          <li>
            ستحصل على <strong>رابط مباشر</strong> لصفحة التسجيل الخاصة ببطاقتك
          </li>
          <li>
            شارك الرابط مع عملائك عبر:
          </li>
        </ol>

        {/* Visual: Sharing channels */}
        <MockUI title="طرق المشاركة">
          <div className="grid grid-cols-2 gap-3">
            <ShareOption icon={<QrCode className="h-5 w-5" />} title="QR Code" desc="اطبعه وضعه على الكاونتر أو الفاتورة" />
            <ShareOption icon={<Smartphone className="h-5 w-5" />} title="واتساب / SMS" desc="أرسل الرابط مباشرة للعملاء" />
            <ShareOption icon={<Link2 className="h-5 w-5" />} title="رابط مباشر" desc="شاركه على انستقرام أو تويتر" />
            <ShareOption icon={<Wallet className="h-5 w-5" />} title="Apple & Google Wallet" desc="البطاقة تُضاف تلقائياً" />
          </div>
        </MockUI>

        <div className="mt-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
          <h4 className="font-bold text-primary text-sm mb-2">🎉 ماذا يحصل للعميل؟</h4>
          <ol className="list-decimal ps-5 space-y-1 text-sm text-foreground/80">
            <li>يفتح الرابط أو يمسح QR</li>
            <li>يسجّل برقم جواله (OTP)</li>
            <li>البطاقة تُصدر تلقائياً وتظهر في تطبيق ستامبلي</li>
            <li>يضيفها لـ Apple Wallet أو Google Wallet بضغطة</li>
            <li>عند كل زيارة — الكاشير يمسح البطاقة ويضيف ختم</li>
          </ol>
        </div>
      </Step>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Step 6 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Step number={6} title="ملاحظات مهمة" icon={Lightbulb}>
        <div className="space-y-3">
          <NoteCard emoji="✏️" title="التعديل بعد النشر" body="تقدر تعدّل الاسم، التصميم، والمكافآت في أي وقت — التعديل ينعكس فوراً على كل العملاء." />
          <NoteCard emoji="📇" title="بطاقات متعددة" body="تقدر تنشئ أكثر من بطاقة — مثلاً بطاقة للقهوة وبطاقة للحلويات. كل بطاقة برابط مختلف." />
          <NoteCard emoji="📱" title="Apple & Google Wallet" body="البطاقة تظهر تلقائياً في المحفظة الرقمية — العميل ما يحتاج يحمّل تطبيق." />
          <NoteCard emoji="📷" title="إضافة الأختام" body="لإضافة ختم للعميل، استخدم ماسح بطاقات الولاء من لوحة التحكم أو من التطبيق مباشرة." />
        </div>
      </Step>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────

function Step({
  number,
  title,
  icon: Icon,
  children,
}: {
  number: number
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Step header */}
      <div className="flex items-center gap-3 bg-muted/50 px-6 py-4 border-b border-border/60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {number}
        </span>
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {/* Step body */}
      <div className="space-y-4 p-6 text-foreground/90">
        {children}
      </div>
    </section>
  )
}

function MockUI({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden">
      <div className="bg-muted/60 px-4 py-2 border-b border-border/60">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function SidebarItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary/10 text-primary font-bold'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      <div className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-primary' : 'bg-transparent'}`} />
      {label}
    </div>
  )
}

function FormField({
  label,
  placeholder,
  hint,
}: {
  label: string
  placeholder: string
  hint: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <div className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        {placeholder}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}

function DetailBlock({
  icon: Icon,
  title,
  details,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  details: string[]
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">{title}</span>
      </div>
      <ul className="list-disc ps-5 space-y-1 text-sm text-foreground/75">
        {details.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    </div>
  )
}

function DesignOption({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  )
}

function ShareOption({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  )
}

function NoteCard({
  emoji,
  title,
  body,
}: {
  emoji: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4 flex items-start gap-3">
      <span className="text-xl shrink-0">{emoji}</span>
      <div>
        <div className="text-sm font-bold text-foreground">{title}</div>
        <div className="text-sm text-foreground/70 mt-1">{body}</div>
      </div>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-primary/5 border-s-4 border-primary p-4 text-sm text-foreground/80">
      {children}
    </div>
  )
}

function UILabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-sm font-semibold text-foreground">
      {children}
    </span>
  )
}

function InlineButton({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  )
}

function InfoChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-foreground/60">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

/**
 * Real screenshot from the admin panel. Rounded corners + subtle
 * border + shadow so it reads as an embedded figure rather than a
 * raw image dump.
 */
function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="mt-4">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full rounded-xl border border-border shadow-sm"
      />
      <figcaption className="mt-2 text-center text-[11px] text-muted-foreground">
        {alt}
      </figcaption>
    </figure>
  )
}
