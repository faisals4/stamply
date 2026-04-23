import { BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

/**
 * /op/documentation — in-app technical reference for new engineers.
 *
 * This is the first thing a developer should read. It explains every
 * major piece of Stamply without asking them to crawl the codebase
 * guessing how the layers fit together. Treat it as living docs:
 * when an architectural decision lands, update the matching section
 * here BEFORE closing the PR.
 *
 * Design choices for this page:
 *   - Plain prose in Arabic (matching the operator-facing UI) with
 *     English technical terms kept verbatim (Laravel, Tailwind, etc.)
 *     so devs can still grep the real class/table names.
 *   - A long single-scroll page rather than tabs — developers read
 *     top-to-bottom the first time, then Cmd-F afterwards.
 *   - No runtime data — this is a static document. If something here
 *     goes stale, fix the doc, not the code.
 */

export default function OpDocumentationPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        icon={<BookOpen />}
        title="التوثيق التقني"
        subtitle="بنية النظام، تفاصيل قاعدة البيانات، التدفقات، والأنماط المعتمدة"
      />

      <div className="space-y-8 text-[15px] leading-relaxed">
        {/* ────────────────────────── Overview ────────────────────────── */}
        <Section title="نظرة عامة" id="overview">
          <p>
            Stamply منصّة SaaS متعددة المستأجرين (multi-tenant) لإدارة
            بطاقات الولاء الرقمية للمقاهي والمطاعم والمتاجر في السعودية.
            العميل يمتلك بطاقة ولاء واحدة لكل تاجر، تُضاف إلى Apple Wallet
            و Google Wallet مباشرة بدون تثبيت تطبيق.
          </p>
          <p>
            المنظومة تتكون من ٤ أجزاء رئيسية:
          </p>
          <ul className="list-disc ps-5 space-y-1">
            <li><Code>api/</Code> — Laravel 12 + PostgreSQL (الخدمة الخلفية)</li>
            <li><Code>web/</Code> — React 19 + Vite + TanStack Query (لوحة التاجر + المنصّة)</li>
            <li><Code>mobile/</Code> — Expo 54 (React Native) لتطبيق العملاء وتطبيق التاجر (iOS/Android)</li>
            <li><Code>api/public/app/</Code> — بناء Expo للويب (نفس الكود، منصة web) يُخدم بنفس الـ origin</li>
          </ul>
        </Section>

        {/* ────────────────────────── Stack ────────────────────────── */}
        <Section title="التقنيات المستخدمة" id="stack">
          <TechTable
            rows={[
              ['الباك إند', 'Laravel 12 (PHP 8.3) + Sanctum auth + Queue workers'],
              ['قاعدة البيانات', 'PostgreSQL 15 — مُحوّل من MySQL بسبب الـ JSON queries'],
              ['كاش', 'Redis للـ session + queue + rate limiting'],
              ['الويب', 'React 19 + Vite + TypeScript + wouter (router) + TanStack Query (server state)'],
              ['UI الويب', 'Tailwind CSS v4 + shadcn/ui (radix primitives)'],
              ['الموبايل', 'Expo 54 (React Native 0.81) + expo-router + NativeWind (Tailwind-in-RN)'],
              ['الترجمة', 'i18next — مشترك بين الويب والموبايل عبر ملفات JSON'],
              ['المحافظ', 'Apple PassKit (passlib PHP) + Google Wallet API (REST + JWT)'],
              ['الإشعارات', 'FCM (Android + Web) + APNs (iOS) + Web Push (VAPID)'],
              ['التخزين', 'Laravel Storage — public disk للصور، private للـ wallet certificates'],
              ['المصادقة', 'Sanctum personal access tokens — لا cookies، كل طلب يحمل Bearer'],
            ]}
          />
        </Section>

        {/* ─────────────── Multi-tenancy ─────────────── */}
        <Section title="الـ Multi-tenancy — كيف يعمل" id="multi-tenancy">
          <p>
            كل تاجر (<Code>tenant</Code>) معزول عن غيره. العزل يُنفّذ عبر:
          </p>
          <ol className="list-decimal ps-5 space-y-2">
            <li>
              <B>TenantScope (Global Scope):</B> كل model يستخدم trait{' '}
              <Code>BelongsToTenant</Code> يضيف global scope تلقائياً
              يصطاد كل queries بـ{' '}
              <Code>where('tenant_id', auth()-&gt;user()-&gt;tenant_id)</Code>.
              هذا يمنع أي تاجر من رؤية بيانات تاجر آخر بالخطأ حتى لو
              نسي المبرمج.
            </li>
            <li>
              <B>Sanctum Token:</B> كل admin user يحمل token مرتبط بـ
              <Code>tenant_id</Code>، مطبوع داخل claims.
            </li>
            <li>
              <B>withoutGlobalScopes(['tenant']):</B> استثناء نادر
              للـ controllers التي تعمل cross-tenant (مثل{' '}
              <Code>CustomerCardsController</Code> — العميل يحمل بطاقات
              من تجار متعددين).
            </li>
          </ol>
          <Callout variant="warn">
            Models تستخدم <Code>BelongsToTenant</Code> حالياً: Tenant, User,
            CardTemplate, IssuedCard, Customer, Stamp, Redemption, Location,
            Message, Automation, PushToken، وغيرها. إجمالي ١٥ model.
          </Callout>
        </Section>

        {/* ─────────────── Customer identity ─────────────── */}
        <Section title="هوية العميل — CustomerProfile الموحّد" id="customer-identity">
          <p>
            العميل الواحد قد يملك بطاقات في عدة تجار — لكن من منظوره
            هو <I>شخص واحد</I>. الـ schema يعكس هذا عبر جدولين:
          </p>
          <ul className="list-disc ps-5 space-y-1">
            <li>
              <Code>customer_profiles</Code> — جدول <B>عالمي</B> (بلا
              tenant_id). المفتاح الأساسي للعميل الحقيقي. يحوي الاسم،
              البريد، تاريخ الميلاد، الهاتف (مفهرس unique).
            </li>
            <li>
              <Code>customers</Code> — جدول <B>محلي</B> لكل tenant،
              يربط <Code>customer_profile_id</Code> بـ <Code>tenant_id</Code>.
              كل tenant يملك صف واحد لكل عميل تسجّل عنده.
            </li>
          </ul>
          <p>
            فائدة ذلك: عميل ثبّت بطاقة في "مقهى أ" ثم دخل على "مقهى ب"
            بنفس الرقم → الباك إند يتعرف عليه ويصنع customer جديد في
            tenant ب لكن يربطه بنفس <Code>customer_profile_id</Code>.
            بياناته الشخصية (الاسم، الإيميل) تظهر للتاجرين بدون تكرار
            إدخال.
          </p>
        </Section>

        {/* ─────────────── Cards schema ─────────────── */}
        <Section title="البطاقات — مخطط الجدولين" id="cards-schema">
          <p>
            البطاقة لها طبقتين:
          </p>
          <TechTable
            rows={[
              [
                'CardTemplate',
                'القالب — ما يصممه التاجر في الـ editor. يحوي الاسم، الأختام المطلوبة، التصميم (JSON)، المكافآت. مملوك لـ tenant.',
              ],
              [
                'IssuedCard',
                'نسخة مُصدَرة من القالب لعميل محدد. يربط customer_id + card_template_id. يحمل الـ serial_number (٦ أحرف) + stamps_count + last_used_at.',
              ],
              ['Stamp', 'حدث إضافة ختم لبطاقة. يحوي given_by_user_id (الكاشير) + count + reason.'],
              ['Redemption', 'حدث استبدال مكافأة. يحوي card_reward_id + given_by_user_id.'],
            ]}
          />
          <Callout variant="info">
            السيريال ٦ أحرف من أبجدية Crockford (31 حرف — بدون 0/O/1/I/L).
            السعة = 31⁶ ≈ 887 مليون قيمة. التوليد في{' '}
            <Code>IssuedCard::generateUniqueSerial()</Code> — يعيد
            المحاولة حتى يجد سيريال غير مستخدم.
          </Callout>
        </Section>

        {/* ─────────────── Apple Wallet ─────────────── */}
        <Section title="Apple Wallet — التكامل" id="apple-wallet">
          <p>
            كل <Code>IssuedCard</Code> يُترجم إلى <Code>.pkpass</Code> عند
            الطلب. العملية في <Code>ApplePassBuilder</Code>:
          </p>
          <ol className="list-decimal ps-5 space-y-1">
            <li>بناء <Code>pass.json</Code> بالحقول: serialNumber، storeCard strip، الألوان من design.</li>
            <li>نسخ الأيقونات + الشعار من storage.</li>
            <li>حساب SHA-1 لكل ملف داخل <Code>manifest.json</Code>.</li>
            <li>توقيع الـ manifest بشهادة Apple Pass Type ID (PEM).</li>
            <li>ضغط الكل في ZIP بامتداد <Code>.pkpass</Code>.</li>
          </ol>
          <p>
            تحديث البطاقات المثبّتة يمر عبر <B>APNs</B>:
          </p>
          <ol className="list-decimal ps-5 space-y-1">
            <li>iPhone يسجل البطاقة عبر <Code>POST /v1/devices/.../registrations/.../{'{serial}'}</Code> → نحفظ push token في <Code>apple_pass_registrations</Code>.</li>
            <li>عند إضافة ختم/استبدال، نرسل silent push عبر APNs لكل pushToken مسجّل.</li>
            <li>iPhone يستجيب بطلب <Code>GET /v1/passes/.../{'{serial}'}</Code> → نرسل <Code>.pkpass</Code> جديد.</li>
          </ol>
        </Section>

        {/* ─────────────── Google Wallet ─────────────── */}
        <Section title="Google Wallet — التكامل" id="google-wallet">
          <p>
            آلية مختلفة عن Apple. بدل ملف pkpass موقّع، Google تستخدم API:
          </p>
          <ol className="list-decimal ps-5 space-y-1">
            <li>
              <B>Class:</B> قالب الـ loyalty (مُشترك بين كل البطاقات
              التي تستخدم نفس <Code>CardTemplate</Code>). نُنشئه مرة
              في Google عبر <Code>GooglePassBuilder::ensureClass()</Code>.
            </li>
            <li>
              <B>Object:</B> بطاقة محددة لعميل محدد. نُنشئه عبر API.
            </li>
            <li>
              <B>Save Link:</B> JWT موقّع بمفتاح service account، يرسله
              المستخدم كـ URL → "Add to Google Wallet" button.
            </li>
            <li>
              <B>تحديث:</B> عند إضافة ختم، نستدعي{' '}
              <Code>PATCH objects/.../{'{id}'}</Code> مباشرة — Google ترسل
              push تلقائياً للجهاز.
            </li>
          </ol>
        </Section>

        {/* ─────────────── Push notifications ─────────────── */}
        <Section title="الإشعارات — 3 قنوات" id="notifications">
          <p>
            <Code>PushService</Code> وسيط موحّد لإرسال إشعارات عبر 3 قنوات حسب المنصة:
          </p>
          <TechTable
            rows={[
              ['iOS (العميل مسجّل في PushToken.platform=ios)', 'APNs مباشرة — مفاتيح team_id + key_id + bundle_id على مستوى المنصة (op)'],
              ['Android', 'FCM — مفاتيح Firebase من google-services.json'],
              ['Web (متصفح desktop/mobile)', 'VAPID Web Push — مفاتيح public/private على مستوى المنصة + endpoint يسجله الـ service worker'],
            ]}
          />
          <p>
            أي إشعار (stamp added, reward ready, broadcast) يستدعي{' '}
            <Code>PushService::dispatchToCustomer()</Code> والوسيط يختار
            القناة حسب الـ platform field.
          </p>
          <Callout variant="info">
            جدول <Code>sent_notifications</Code> يحتفظ بتاريخ كل broadcast
            (/op/notifications). كل notification يولّد صفوف في{' '}
            <Code>sent_notification_recipients</Code> — صف لكل device
            token مع status=sent/failed.
          </Callout>
        </Section>

        {/* ─────────────── Routing structure ─────────────── */}
        <Section title="بنية المسارات" id="routing">
          <TechTable
            rows={[
              ['/', 'الصفحة التعريفية (Landing) — React في web/src/pages/landing'],
              ['/admin/*', 'لوحة التاجر — React، يتطلب Sanctum token بـ ability=tenant'],
              ['/op/*', 'لوحة المنصّة — React، يتطلب Sanctum token بـ ability=op (platform admin)'],
              ['/c/{serial}', 'صفحة بطاقة عامة (يشاركها العميل) — عرض فقط بدون مصادقة'],
              ['/app/*', 'تطبيق العميل كـ PWA — Expo Web build (react-native-web)'],
              ['/api/*', 'Laravel REST API — كل الـ controllers تحت app/Http/Controllers/Api'],
              ['/pass/{serial}', 'Apple Wallet pass download — يولّد pkpass'],
              ['/v1/*', 'Apple Wallet web service (registration/unregister من iPhone)'],
            ]}
          />
        </Section>

        {/* ─────────────── Permission system ─────────────── */}
        <Section title="نظام الصلاحيات" id="permissions">
          <p>
            3 طبقات حماية على كل request:
          </p>
          <ol className="list-decimal ps-5 space-y-2">
            <li>
              <B>Sanctum ability</B> (<Code>abilities:tenant|op</Code>):
              يحدد أي token يستطيع يدخل أي مجموعة routes.
            </li>
            <li>
              <B>CheckPermission middleware</B> (<Code>can.perm:xxx</Code>):
              يفحص دور المستخدم (owner/manager/cashier) مقابل
              permission catalog في <Code>PermissionCatalog.php</Code>.
              كل route له permission واحد (cards.view, scan.give_stamp,
              إلخ) والدور له قائمة permissions ممنوحة.
            </li>
            <li>
              <B>CheckSubscription middleware</B>: بعض routes
              (<Code>plan.quota:locations</Code>) تفحص الحد الأعلى في
              plan الاشتراك.
            </li>
          </ol>
          <p>
            الأدوار المدعومة: <Code>owner</Code> (كامل الصلاحيات، لا يُعدّل)،{' '}
            <Code>admin</Code> / <Code>manager</Code> / <Code>cashier</Code> /
            <Code>marketer</Code> (قابلة للتعديل من{' '}
            <Code>/admin/managers/permissions/:role</Code>).
          </p>
        </Section>

        {/* ─────────────── Web/Mobile shared code ─────────────── */}
        <Section title="الكود المشترك web ⇄ mobile" id="shared-code">
          <p>
            نفس مكوّن Expo يُبنى لـ ٣ أهداف:
          </p>
          <TechTable
            rows={[
              ['iOS native', 'expo build → .ipa — من mobile/ios/ (ejected)'],
              ['Android native', 'expo build → .apk — managed (بدون android/ folder بعد)'],
              ['Web (PWA)', 'expo export --platform web → api/public/app/ → يُخدم من Laravel'],
            ]}
          />
          <p>
            الاختلافات الحرجة:
          </p>
          <ul className="list-disc ps-5 space-y-1">
            <li>
              <Code>Platform.OS === 'web'</Code> checks في الكود
              للتحكم بالـ RTL flipping + geolocation + storage backend.
            </li>
            <li>
              التخزين: <Code>expo-secure-store</Code> على الـ native،{' '}
              <Code>localStorage</Code> على الويب — موحّد خلف{' '}
              <Code>mobile/lib/storage.ts</Code>.
            </li>
            <li>
              الترجمة: i18n instance واحد، لكن <Code>I18nManager.forceRTL()</Code>{' '}
              يُستدعى على native فقط (web يعتمد على <Code>document.dir</Code>).
            </li>
          </ul>
        </Section>

        {/* ─────────────── Build & deploy ─────────────── */}
        <Section title="البناء والنشر" id="build-deploy">
          <TechTable
            rows={[
              ['Dev server', 'cd web && npm run dev → Vite على :5190 (proxies /api إلى Laravel :8888)'],
              ['Laravel local', 'cd api && php artisan serve → :8888'],
              ['ngrok tunnel', 'ngrok http 5190 → stamply.ngrok.app — Vite يقبل host headers الأجنبية'],
              ['Web build', 'cd web && npm run build → dist/ (Laravel يخدمها في production)'],
              ['Mobile web export', 'cd mobile && npm run build:web → api/public/app/ (postbuild script يحقن RTL + font preloads)'],
              ['iOS TestFlight', 'eas build --platform ios + submit عبر App Store Connect'],
              ['Android Play', 'eas build --platform android (لاحقاً)'],
            ]}
          />
        </Section>

        {/* ─────────────── Common patterns ─────────────── */}
        <Section title="أنماط متكررة لازم تعرفها" id="patterns">
          <H4>1. Paginated API responses</H4>
          <p>
            كل قائمة ترجع <Code>&#123; data: T[], meta: &#123; current_page, last_page, total, ... &#125; &#125;</Code>.
            الـ frontend يستعمل <Code>usePaginatedQuery</Code> (في{' '}
            <Code>web/src/lib/hooks</Code>) — لا تستدعي <Code>useQuery</Code> مباشرة مع paginated endpoint.
          </p>

          <H4>2. TanStack Query keys</H4>
          <p>
            كل المفاتيح في <Code>web/src/lib/queryKeys.ts</Code> —{' '}
            <B>لا تكتب string arrays مباشرة</B>. عند تغيير resource،
            استدعِ <Code>queryClient.invalidateQueries({'{ queryKey: queryKeys.xxx() }'})</Code>.
          </p>

          <H4>3. invalidateQueries مع await</H4>
          <p>
            دالة <Code>invalidateQueries</Code> ترجع Promise — إذا
            كنت تريد تشغيل loader حتى اكتمال الـ refetch، استعمل{' '}
            <Code>await</Code>. بدون await، loader يختفي مباشرة.
          </p>

          <H4>4. RTL / LTR على الويب</H4>
          <p>
            نعتمد على <Code>document.documentElement.dir</Code> فقط.
            لا نستدعي <Code>I18nManager.forceRTL()</Code> على web (يسبب
            double-flip مع row-reverse في الكود).
          </p>

          <H4>5. Password sanitization</H4>
          <p>
            كل حقول كلمات المرور (login/signup/change) تمر عبر{' '}
            <Code>sanitizePassword()</Code> (web) أو{' '}
            <Code>sanitizePassword.ts</Code> (mobile) لحذف الأحرف العربية
            + المسافات تلقائياً.
          </p>

          <H4>6. Subscription guard</H4>
          <p>
            قبل أي write action، استدعِ <Code>useSubscriptionGuard()</Code> —
            يفحص هل الاشتراك نشط + quota باقي. ميدل وير الباك إند
            <Code>CheckSubscription</Code> يلفّ كل endpoint write.
          </p>
        </Section>

        {/* ─────────────── Directory structure ─────────────── */}
        <Section title="بنية المجلدات" id="directories">
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto leading-5" dir="ltr">{`Stamply/
├── api/                      Laravel backend
│   ├── app/
│   │   ├── Models/           Eloquent models (with BelongsToTenant trait)
│   │   ├── Http/Controllers/
│   │   │   ├── Api/Tenant/   /admin endpoints
│   │   │   ├── Api/Op/       /op platform admin endpoints
│   │   │   └── Api/App/      /app (customer) endpoints
│   │   ├── Services/
│   │   │   ├── Wallet/       Apple + Google pass builders
│   │   │   ├── Messaging/    PushService, FcmTransport
│   │   │   └── Notifications/ BroadcastNotifier
│   │   └── Console/Commands/ Artisan commands (cards:regenerate-serials...)
│   ├── database/migrations/  Time-stamped schema changes
│   ├── routes/api.php        All API routes grouped by ability
│   └── public/app/           Expo web build output
├── web/                      Merchant + Op dashboard (React)
│   └── src/
│       ├── pages/            One folder per section (admin, op, auth)
│       ├── components/       Reusable UI (ui/ for shadcn primitives)
│       ├── lib/api/          API client wrappers per resource
│       └── lib/hooks/        Custom React hooks
└── mobile/                   Expo app (iOS + Android + Web)
    ├── app/                  expo-router routes (file-based)
    ├── components/           RN-web compatible components
    ├── business/             Merchant-facing screens (cashier, dashboard)
    ├── locales/              ar.json + en.json (shared with web? no, separate)
    ├── lib/                  Platform-aware utilities
    └── ios/                  Ejected Xcode project`}</pre>
        </Section>

        {/* ─────────────── Key conventions ─────────────── */}
        <Section title="اصطلاحات الكود" id="conventions">
          <ul className="list-disc ps-5 space-y-2">
            <li>
              <B>اللغة التعريفية:</B> الـ UI بالعربية، الـ code comments
              بالإنجليزية، commit messages إنجليزية.
            </li>
            <li>
              <B>الألوان:</B> اللون الأساسي <Code>#eb592e</Code> (برتقالي).
              معرّف في <Code>web/src/index.css</Code> كـ <Code>--primary</Code>{' '}
              و في <Code>mobile/lib/colors.ts</Code> للـ RN.
            </li>
            <li>
              <B>الخط:</B> IBM Plex Sans Arabic (4 أوزان) — preload في{' '}
              <Code>index.html</Code> + postbuild script للـ Expo web.
            </li>
            <li>
              <B>الأيقونات:</B> lucide-react (web) / lucide-react-native (mobile).
            </li>
            <li>
              <B>التواريخ:</B> دائماً ميلادي بالإنجليزي في الـ UI (مو
              هجري) لتجنّب لبس التجار. التنسيق:{' '}
              <Code>Intl.DateTimeFormat('en-GB', ...)</Code>.
            </li>
            <li>
              <B>Logs:</B> <Code>storage/logs/laravel.log</Code> —
              فحصه عند أي 500. الأخطاء مثل{' '}
              <Code>Call to undefined method ...</Code> تظهر هناك
              قبل أن يوثّقها المتصفح.
            </li>
          </ul>
        </Section>

        {/* ─────────────── Recent decisions ─────────────── */}
        <Section title="قرارات حديثة يجب معرفتها" id="recent-decisions">
          <Callout variant="info">
            <B>VAPID keys موحّدة على المنصة:</B> كل التجار يستعملون نفس
            زوج VAPID public/private المخزّن في{' '}
            <Code>platform_settings</Code>. التاجر لا يولّدها. الكود
            القديم لـ <Code>PushService::ensureVapidKeys()</Code> حُذف
            واستُبدل بـ <Code>ensurePlatformVapidKeys()</Code>.
          </Callout>
          <Callout variant="info">
            <B>السيريال قُصّر إلى ٦ أحرف:</B> كان ١٢ حرف، صار ٦ لسهولة
            القراءة والنسخ. إعادة التوليد تمت عبر{' '}
            <Code>php artisan cards:regenerate-serials</Code>.
          </Callout>
          <Callout variant="info">
            <B>اللون الأساسي برتقالي:</B> استُبدل اللون البنفسجي
            (<Code>#8B52F6</Code>) بالبرتقالي (<Code>#eb592e</Code>)
            في الويب كلّه. classes <Code>violet-*</Code> و{' '}
            <Code>purple-*</Code> استُبدلت بـ <Code>orange-*</Code>.
          </Callout>
          <Callout variant="info">
            <B>Blank screens:</B> أصلحنا بقين حرجة — <Code>listLocations</Code>{' '}
            يرجع Paginated envelope (لا مصفوفة)،{' '}
            <Code>StaffEdit</Code> يعالج 404 بشكل صحيح الآن.
          </Callout>
        </Section>

        {/* ─────────────── Troubleshooting ─────────────── */}
        <Section title="دليل الاستكشاف — مشاكل شائعة" id="troubleshooting">
          <TechTable
            rows={[
              [
                '401 على كل الـ /api',
                'Sanctum token انتهى. سجل خروج ثم ادخل. لو استمرّت → تحقق من CORS في config/cors.php.',
              ],
              [
                '500 على admin endpoint',
                'افحص api/storage/logs/laravel.log — غالباً method removed أو migration لم يُشغّل.',
              ],
              [
                'شاشة بيضاء على route',
                '(1) افحص console للأخطاء، (2) تحقق أن useQuery لا يحاول .map على Paginated envelope.',
              ],
              [
                'Pass لا يتحدث على iPhone',
                'افحص apple_pass_registrations — هل فيه صف بـ device_token؟ لو لا، المستخدم لم يسجل. لو نعم، افحص APNs logs.',
              ],
              [
                'Push على Android لا يصل',
                'افحص google-services.json مُرفق، و FCM key في platform_settings.',
              ],
              [
                'Wallet button لا يظهر',
                'افحص tenant settings — هل الـ wallet (apple/google) مُفعّل في plan؟',
              ],
            ]}
          />
        </Section>

        <div className="pt-4 pb-6 text-center text-xs text-muted-foreground">
          آخر تحديث للوثيقة: مع كل قرار معماري. إذا فيه شيء ناقص أو غير
          صحيح، عدّله في <Code>web/src/pages/op/OpDocumentation.tsx</Code>.
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Helpers ─────────────── */

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold mb-4 text-foreground">{title}</h2>
      <div className="space-y-3 text-foreground/90">{children}</div>
    </section>
  )
}

function H4({ children }: { children: React.ReactNode }) {
  return <h4 className="font-semibold text-sm text-foreground mt-3">{children}</h4>
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded bg-muted text-[13px] font-mono text-foreground whitespace-nowrap"
      dir="ltr"
    >
      {children}
    </code>
  )
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>
}

function I({ children }: { children: React.ReactNode }) {
  return <em className="italic">{children}</em>
}

function Callout({
  variant = 'info',
  children,
}: {
  variant?: 'info' | 'warn'
  children: React.ReactNode
}) {
  const cls =
    variant === 'warn'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-orange-50 border-orange-200 text-orange-900'
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${cls}`}
      // Callouts contain mixed Arabic body + English code snippets —
      // let the browser's BiDi algorithm sort it out.
    >
      {children}
    </div>
  )
}

function TechTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={i} className={i > 0 ? 'border-t border-border' : ''}>
              <td className="px-3 py-2 bg-muted/40 font-semibold whitespace-nowrap align-top">
                {k}
              </td>
              <td className="px-3 py-2 align-top">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
