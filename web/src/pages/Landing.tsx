import { useEffect, useRef, useState } from 'react'
import { Link } from 'wouter'
import {
  CreditCard,
  Users,
  ScanLine,
  Smartphone,
  MapPin,
  MessageSquare,
  UserCog,
  BarChart3,
  Lock,
  Wallet,
  Check,
  ArrowLeft,
  Mail,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/Logo'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

/**
 * Public marketing landing page mounted at `/`.
 *
 * Bilingual-aware (Arabic-first / RTL). Section pattern: nav → hero →
 * social proof → "what is it" → features → how it works → pricing → CTA
 * → footer. Every claim reflects something Stamply ACTUALLY does today.
 *
 * Smooth anchor scroll: handled natively by the browser via
 *   `html { scroll-behavior: smooth }` (in index.css)
 * combined with `scroll-mt-20` on every section that has an id, which gives
 * the native scroll an 80px offset so targets don't get hidden behind the
 * sticky 64px header. No JS click handler needed.
 */
export default function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Nav user={user} />
      <Hero user={user} />
      <Stats />
      <WhatIs />
      <NoApp />
      <Features />
      <HowItWorks />
      <Pricing />
      <FinalCta user={user} />
      <Footer />
    </div>
  )
}

/* ─── nav ───────────────────────────────────────────────────── */

function Nav({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <Logo height={32} />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">المزايا</a>
          <a href="#how-it-works" className="hover:text-foreground transition">كيف يعمل</a>
          <a href="#pricing" className="hover:text-foreground transition">الأسعار</a>
          <a href="#contact" className="hover:text-foreground transition">تواصل</a>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/admin">
              <Button className="group">
                لوحة التحكم
                <ArrowLeft className="w-4 h-4 ms-1.5 transition-transform duration-300 group-hover:-translate-x-1" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/admin/login">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  تسجيل الدخول
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="group">
                  ابدأ مجاناً
                  <ArrowLeft className="w-4 h-4 ms-1.5 transition-transform duration-300 group-hover:-translate-x-1" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

/* ─── hero ──────────────────────────────────────────────────── */

function Hero({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-start">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              نظام بطاقات ولاء رقمية متكامل
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 tracking-tight">
              ارفع معدل رجوع
              <br />
              <span className="text-primary">عملائك بسهولة</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              نظام بطاقات ولاء رقمية يساعدك على تشجيع عملاءك للعودة بشكل
              متكرر، مما ينعكس على زيادة المبيعات وتحسين استقرار الإيرادات.
              بدون تطبيق، بدون بطاقات بلاستيكية، وبتجربة سهلة ومتكاملة.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              {user ? (
                <Link href="/admin">
                  <Button size="lg" className="group text-base h-12 px-8">
                    افتح لوحة التحكم
                    <ArrowLeft className="w-5 h-5 ms-2 transition-transform duration-300 group-hover:-translate-x-1.5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup">
                    <Button size="lg" className="group text-base h-12 px-8">
                      جرّب مجاناً 14 يوماً
                      <ArrowLeft className="w-5 h-5 ms-2 transition-transform duration-300 group-hover:-translate-x-1.5" />
                    </Button>
                  </Link>
                  <a href="#how-it-works">
                    <Button size="lg" variant="outline" className="text-base h-12 px-8">
                      شاهد كيف يعمل
                    </Button>
                  </a>
                </>
              )}
            </div>

          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl blur-2xl" />
            <img
              src="/login-hero.png"
              alt="مثال على بطاقة ولاء Stamply"
              className="relative w-full max-w-xl mx-auto"
              width={1152}
              height={768}
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href="#what-is"
            className="text-muted-foreground hover:text-foreground transition animate-bounce"
          >
            <ChevronDown className="w-6 h-6" />
          </a>
        </div>
      </div>
    </section>
  )
}

/* ─── stats ─────────────────────────────────────────────────── */

function Stats() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <Stat
          big="40٪"
          label="زيادة في معدّل الاحتفاظ بالعملاء"
          sub="عملاء ولاء يعودون أكثر من مرة"
        />
        <Stat
          big="30٪"
          label="نمو في تحويل الزوّار إلى عملاء"
          sub="مع برامج المكافآت والأختام"
        />
        <Stat
          big="70٪"
          label="من العملاء يفضّلون التخصيص"
          sub="رسائل وعروض موجّهة لكل شريحة"
        />
      </div>
    </section>
  )
}

function Stat({ big, label, sub }: { big: string; label: string; sub: string }) {
  return (
    <div className="text-center">
      <div className="text-5xl sm:text-6xl font-bold text-primary mb-2">{big}</div>
      <div className="font-semibold text-sm">{label}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  )
}

/* ─── what is it ────────────────────────────────────────────── */

function WhatIs() {
  return (
    <section id="what-is" className="py-20 sm:py-28 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
              ما هو ستامبلي؟
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
              بطاقة ولاء رقمية بدون متاعب البطاقة الورقية
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg mb-4">
              ستامبلي هي منصة بطاقات ولاء رقمية متكاملة تساعدك على تحويل
              زيارات عملاءك إلى عودة مستمرة من خلال تجربة بسيطة وسريعة، حيث
              يسجّل عملاؤك خلال ثوانٍ عبر رابط من جوّالهم، يجمعون الأختام مع
              كل زيارة، ويستبدلون مكافآتهم بسهولة، كل ذلك بدون الحاجة لتحميل
              أي تطبيق.
            </p>
            <ul className="space-y-3 mt-6">
              {[
                'بطاقة ولاء واحدة لكل عميل بدون تطبيق',
                'مسح QR من ماسح ويب يعمل على أي جهاز',
                'إدارة كاملة من لوحة تحكم عربية',
                'دعم متعدد الفروع والموظفين بصلاحيات محددة',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-sm">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center">
            <img
              src="/what-is-illustration.png"
              alt="عميل سعيد يحمل أكواب قهوة وبطاقات ولاء Stamply"
              className="w-full max-w-[320px] h-auto whatis-float"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── no app needed ────────────────────────────────────────── */

function NoApp() {
  return (
    <section className="py-20 bg-muted/30 border-y border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 flex justify-center">
            <img
              src="/landing-phone-mockup.png"
              alt="معاينة بطاقة الولاء على الجوال"
              className="w-full max-w-[320px] h-auto"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
              <Smartphone className="w-3.5 h-3.5" />
              بدون أي تطبيق
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
              يفتح من المتصفح مباشرة
              <br />
              <span className="text-primary">لا حاجة لتنزيل أي شيء</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6">
              عميلك يمسح رمز QR من جوّاله، يعبّئ اسمه ورقم جواله، وتظهر له
              بطاقته فوراً في المتصفح كصفحة Web App كاملة الميزات. أحفظها
              للشاشة الرئيسية بضغطة واحدة.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'يعمل على iPhone و Android',
                'بدون تثبيت أو حساب',
                'سرعة فتح فورية',
                'تحديث تلقائي عند كل ختم',
              ].map((line) => (
                <li key={line} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── features grid ────────────────────────────────────────── */

function Features() {
  const features = [
    {
      icon: CreditCard,
      title: 'محرّر بطاقات بصري',
      desc: 'صمّم بطاقتك بألوانك وشعارك واختر عدد الأختام والمكافآت — كل شيء بمعاينة حية أثناء التصميم.',
    },
    {
      icon: Users,
      title: 'إدارة العملاء',
      desc: 'كل عميل في مكان واحد: بطاقاته، أختامه، آخر زيارة، وتاريخ المكافآت المستبدلة.',
    },
    {
      icon: ScanLine,
      title: 'ماسح كاشير ويب',
      desc: 'ماسح QR من المتصفح يعمل على أي جهاز. أعطِ الأختام واصرف المكافآت في ثوانٍ معدودة.',
    },
    {
      icon: MessageSquare,
      title: 'رسائل جماعية',
      desc: 'أرسل دفعات بريد إلكتروني أو SMS لكل عملائك أو لشريحة محددة — مع متغيرات لتخصيص كل رسالة.',
    },
    {
      icon: MapPin,
      title: 'فروع متعددة',
      desc: 'أضف كل فروعك واربط الكاشيرات بها. كل فرع يعمل باستقلالية تحت نفس العلامة التجارية.',
    },
    {
      icon: UserCog,
      title: 'مستخدمون وصلاحيات',
      desc: 'ثلاثة أدوار جاهزة (مدير، مدير فرع، كاشير) مع تحكم كامل بصلاحيات كل دور على 21 صلاحية مختلفة.',
    },
    {
      icon: BarChart3,
      title: 'تقارير وتصدير',
      desc: 'لوحة إحصائيات مع رسوم بيانية للأداء + تصدير CSV كامل للعملاء والأختام والمكافآت.',
    },
    {
      icon: Lock,
      title: 'حماية وعزل بيانات',
      desc: 'كل تاجر معزول تماماً عن غيره. صلاحيات على مستوى API و UI لحماية بياناتك.',
    },
    {
      icon: Wallet,
      title: 'محفظة Apple/Google',
      desc: 'بطاقاتك تُضاف مباشرة إلى محفظة Apple Wallet و Google Wallet، مع تحديثات لحظية.',
    },
  ]

  return (
    <section id="features" className="py-20 sm:py-28 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            كل ما تحتاجه في منصة واحدة
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            ميزات احترافية مصمّمة لأعمالك
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            من تصميم البطاقة إلى تقارير الأداء، كل ما تحتاجه لإدارة برنامج
            ولاء عملائك في مكان واحد.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-lg transition group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── how it works ─────────────────────────────────────────── */

function HowItWorks() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const steps = [
    {
      n: '1',
      title: 'سجّل نشاطك مجاناً',
      desc: 'أدخل اسم نشاطك وأنشئ حسابك في أقل من دقيقة. لا حاجة لبطاقة ائتمان.',
    },
    {
      n: '2',
      title: 'صمّم بطاقتك',
      desc: 'اختر الألوان والشعار وعدد الأختام، وأضف مكافآتك. معاينة حية أثناء التصميم.',
    },
    {
      n: '3',
      title: 'انشر رابط البطاقة',
      desc: 'احصل على رابط أو رمز QR لبطاقتك وضعه على المنيو، الكاشير، أو حسابك في إنستغرام.',
    },
    {
      n: '4',
      title: 'ابدأ بإعطاء الأختام',
      desc: 'افتح ماسح الكاشير، امسح بطاقة العميل، وأعطِه ختمه — كل شيء في ثوانٍ.',
    },
  ]

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-muted/30 border-y border-border scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            ابدأ خلال 5 دقائق
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">كيف يعمل ستامبلي ؟</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            أربع خطوات بسيطة من التسجيل إلى أول ختم لعميلك.
          </p>
        </div>

        <div ref={gridRef} className={`grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 ${visible ? 'steps-visible' : ''}`}>
          {steps.map((s, i) => (
            <div key={s.n} className="relative flex flex-col items-center text-center step-circle">
              <div className="step-circle-visual w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full bg-primary text-primary-foreground flex flex-col items-center justify-center p-3 mb-4">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-none">{s.n}</div>
                <div className="text-[10px] sm:text-xs lg:text-sm font-semibold mt-1.5 leading-tight">{s.title}</div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 -end-4 -translate-y-1/2 text-primary/30">
                  <ArrowLeft className="w-6 h-6" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── pricing ──────────────────────────────────────────────── */

function Pricing() {
  const tiers = [
    {
      name: 'الأساسي',
      price: '40',
      tag: '/شهرياً',
      description: 'مثالي للمتاجر الصغيرة وبدايات الأعمال',
      features: [
        'بطاقة ولاء واحدة',
        'فرع واحد',
        'عملاء غير محدود',
        'أختام غير محدودة',
        'لوحة تحكم كاملة',
        'محفظة Apple/Google',
        'إرسال التنبيهات غير محدود',
        'ترحيب عند الموقع',
        'تقارير أساسية',
      ],
      cta: 'ابدأ مجاناً',
      featured: false,
    },
    {
      name: 'النمو',
      price: '80',
      tag: '/شهرياً',
      description: 'للأعمال التي تنمو وتحتاج فروعاً متعددة',
      features: [
        '3 بطاقات ولاء',
        '3 فروع',
        '10 مستخدمين',
        'رسائل جماعية SMS + بريد',
        'حقول تسجيل مخصصة',
        'محفظة Apple/Google',
        'إرسال التنبيهات غير محدود',
        'ترحيب عند الموقع',
        'تصدير CSV',
        'تقارير متقدمة',
      ],
      cta: 'ابدأ تجربتك',
      featured: true,
    },
    {
      name: 'الأعمال',
      price: '120',
      tag: '/شهرياً',
      description: 'للسلاسل والمؤسسات الكبيرة',
      features: [
        '10 بطاقات ولاء',
        '10 فروع',
        '50 مستخدماً',
        'كل ميزات النمو',
        'محفظة Apple/Google',
        'إرسال التنبيهات غير محدود',
        'ترحيب عند الموقع',
        'API + Webhooks',
      ],
      cta: 'تواصل معنا',
      featured: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 sm:py-28 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            خطط بسيطة وشفافة
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">اختر الخطة التي تناسبك</h2>
          <p className="text-muted-foreground text-lg">
            ابدأ بتجربة مجانية 14 يوماً — بدون بطاقة ائتمان مطلوبة.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={cn(
                'rounded-2xl border p-6 sm:p-8 relative flex flex-col',
                t.featured
                  ? 'border-primary bg-primary/5 ring-4 ring-primary/10 shadow-xl scale-100 lg:scale-105'
                  : 'border-border bg-card',
              )}
            >
              {t.featured && (
                <div className="absolute -top-3 start-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  الأكثر شعبية
                </div>
              )}
              <h3 className="font-bold text-xl mb-2">{t.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{t.description}</p>
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-5xl font-bold leading-none">{t.price}</span>
                  <img
                    src="/riyal.svg"
                    alt="ريال"
                    className="w-7 h-7 opacity-80"
                  />
                  <span className="text-sm text-muted-foreground">{t.tag}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>أو</span>
                  <span className="font-semibold text-foreground">
                    {Number(t.price) * 12 * 0.8}
                  </span>
                  <img src="/riyal.svg" alt="ريال" className="w-3 h-3 opacity-70" />
                  <span>سنوياً</span>
                  <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold ms-1">
                    خصم 20%
                  </span>
                </div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button
                  className={cn('w-full', !t.featured && 'variant-outline')}
                  variant={t.featured ? 'default' : 'outline'}
                  size="lg"
                >
                  {t.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          الأسعار بالريال السعودي. كل الخطط تشمل تجربة مجانية 14 يوماً.
        </p>
      </div>
    </section>
  )
}

/* ─── final CTA ────────────────────────────────────────────── */

function FinalCta({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  return (
    <section className="py-20 sm:py-28 bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight">
          جاهز ترفع معدّل رجوع عملائك؟
        </h2>
        <p className="text-lg sm:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
          ابدأ بتجربة مجانية اليوم. بدون بطاقة ائتمان، بدون التزام، وبدعم
          كامل من فريقنا.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {user ? (
            <Link href="/admin">
              <Button
                size="lg"
                className="group bg-background text-primary hover:bg-background/90 h-12 px-8 text-base"
              >
                افتح لوحة التحكم
                <ArrowLeft className="w-5 h-5 ms-2 transition-transform duration-300 group-hover:-translate-x-1.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button
                  size="lg"
                  className="group bg-background text-primary hover:bg-background/90 h-12 px-8 text-base"
                >
                  ابدأ مجاناً الآن
                  <ArrowLeft className="w-5 h-5 ms-2 transition-transform duration-300 group-hover:-translate-x-1.5" />
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 h-12 px-8 text-base"
                >
                  تسجيل الدخول
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

/* ─── footer ───────────────────────────────────────────────── */

function Footer() {
  return (
    <footer id="contact" className="bg-neutral-950 text-white/70 py-12 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2">
            <div className="mb-4">
              <Logo height={32} variant="white" />
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              منصة بطاقات ولاء رقمية متكاملة للأعمال. نساعدك على بناء علاقة
              دائمة مع عملائك.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">ستامبلي</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition">المزايا</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition">كيف يعمل</a></li>
              <li><a href="#pricing" className="hover:text-white transition">الأسعار</a></li>
              <li><Link href="/signup" className="hover:text-white transition">سجّل مجاناً</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">تواصل معنا</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:hello@stamply.cards" className="hover:text-white transition inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  hello@stamply.cards
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>© {new Date().getFullYear()} Stamply. جميع الحقوق محفوظة.</div>
          <div className="flex items-center gap-4">
            <span>صنع بـ ❤️ في الرياض</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
