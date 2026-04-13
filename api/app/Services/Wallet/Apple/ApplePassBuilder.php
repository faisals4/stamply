<?php

namespace App\Services\Wallet\Apple;

use App\Models\IssuedCard;
use App\Services\PlatformSettingsService;
use Imagick;
use ImagickDraw;
use ImagickPixel;
use RuntimeException;
use ZipArchive;

/**
 * Build and sign an Apple Wallet .pkpass for an issued card.
 *
 * Credentials come from `platform_settings.wallet.apple` (managed from
 * `/op/settings`), NOT from config files — Stamply owns one Pass Type ID
 * certificate at the platform level and uses it for every tenant. Each
 * pass still shows the tenant's name, colors, and logo via `buildPassData`.
 *
 * .pkpass format (straight from Apple docs):
 *   a plain ZIP containing
 *     - pass.json (the structured data)
 *     - icon.png, icon@2x.png, icon@3x.png (required)
 *     - logo.png, logo@2x.png, logo@3x.png (required for store cards)
 *     - manifest.json (SHA-1 of every other file, keyed by filename)
 *     - signature (PKCS#7 detached signature of manifest.json, signed with
 *       the Pass Type ID cert + chained to Apple's WWDR intermediate)
 *
 * No third-party library needed — PHP's openssl + ZipArchive are enough.
 */
class ApplePassBuilder
{
    /** Bundled asset directory (relative to base_path). */
    private const ASSET_DIR = 'resources/wallet-assets/apple';

    /** Default Arabic + English field labels — used as fallbacks when
     *  the tenant hasn't overridden them in `design.labels`. Mirrors
     *  `DEFAULT_LABELS` in `web/src/types/card.ts`.
     *  NOTE: `title` / `titleEn` intentionally have NO defaults — they
     *  represent the optional display title and stay empty when the
     *  tenant doesn't set them, so `logoText` is omitted from pass.json
     *  and Apple Wallet hides the title row entirely. */
    private const DEFAULT_LABELS = [
        'stamps' => 'الأختام',
        'stampsEn' => 'Stamps',
        'reward' => 'المكافأة',
        'rewardEn' => 'Gift',
        'customer' => 'العميل',
        'customerEn' => 'Customer',
        // changeMessage templates — `%@` is the literal placeholder iOS
        // swaps for the new field value when sending the lock-screen
        // notification. Wording follows Apple's HIG: short, imperative,
        // and value-first so the user sees the new count instantly.
        'change_stamps' => 'تم تحديث عدد الأختام إلى %@',
        'change_stampsEn' => 'Stamps updated to %@',
        'change_gifts' => 'لديك %@ هدية متاحة',
        'change_giftsEn' => '%@ gift(s) available',
        // Announcement back field — label is what users see in the
        // pass back; the change message is the lock-screen notification
        // template. Both default to neutral wording that any merchant
        // can ship without customizing.
        'announcement' => 'آخر إعلان',
        'announcementEn' => 'Latest announcement',
        'change_announcement' => '%@',
        'change_announcementEn' => '%@',
    ];

    /** Per-field character limits derived from Apple Wallet's practical
     *  truncation thresholds. We hard-cap any tenant-supplied label here
     *  so a too-long override never breaks the pass layout on a real
     *  device. Mirrors `LABEL_LIMITS` in DesignTab.tsx. */
    private const LABEL_LIMITS = [
        'title' => 24,
        'stamps' => 12,
        /** Reward label is reused twice: as the secondaryField label
         *  AND as the GIFT counter headerField label opposite the logo.
         *  Tenant only types it once. */
        'reward' => 15,
        'customer' => 15,
    ];

    /**
     * Localised label keys we ship inside `<lang>.lproj/pass.strings`.
     * pass.json uses these keys as field labels and iOS swaps them with
     * the right language at render time, based on the device's primary
     * language. This is the official Apple Wallet i18n pattern.
     *
     * `LOGO_TEXT` is special: it's used as the value of `logoText` (not
     * a field label). When the tenant leaves the title empty, we omit
     * the entire `logoText` key from pass.json so Apple Wallet hides
     * the title row entirely. The .strings entry still ships so an
     * existing pkpass with a key reference doesn't break.
     */
    private const LABEL_KEYS = [
        'title' => 'LOGO_TEXT',
        'stamps' => 'STAMPS_LABEL',
        'reward' => 'REWARD_LABEL',
        'customer' => 'CUSTOMER_LABEL',
        // changeMessage templates — `%@` is the magic placeholder Apple
        // replaces with the new field value at notification time.
        // These keys ship inside <lang>.lproj/pass.strings so the lock
        // screen notification reads naturally in the device language.
        'change_stamps' => 'CHANGE_STAMPS',
        'change_gifts' => 'CHANGE_GIFTS',
        // Announcement back field — the merchant can broadcast a short
        // message (offer, holiday hours, etc.). Apple shows the new
        // value as a lock-screen notification when this field changes.
        'announcement' => 'ANNOUNCEMENT_LABEL',
        'change_announcement' => 'CHANGE_ANNOUNCEMENT',
    ];

    public function __construct(private readonly IssuedCard $card) {}

    /**
     * Build the pass.json structure Apple expects. Uses the tenant's
     * branding where possible and falls back to Stamply defaults.
     */
    public function buildPassData(): array
    {
        $this->card->loadMissing([
            'template.rewards',
            'template.tenant',
            'template.locations',
            // Profile carries the customer's personal fields
            // (first_name, last_name, phone) that we render on
            // the pass secondary fields.
            'customer.profile',
        ]);

        $template = $this->card->template;
        $tenant = $template?->tenant;
        $design = $template->design ?? [];
        $colors = $design['colors'] ?? [];

        $reward = $template->rewards->first();
        $stampsRequired = $reward?->stamps_required ?? 10;

        $appleConfig = app(PlatformSettingsService::class)->get('wallet.apple');

        // "Organization" shown on the pass — prefer tenant name, fall back
        // to the operator-configured platform name, then a generic default.
        $organizationName = $tenant?->name
            ?? ($appleConfig['organization_name'] ?? '')
            ?: 'Stamply';

        // Display title — Apple Wallet shows this next to the logo at
        // the top of the pass AND on lock-screen notifications. Source
        // priority (resolveLabel handles the actual lookup; this guard
        // just decides whether to emit `logoText` at all):
        //   1. Per-card override `design.labels.title` / `titleEn`
        //   2. The card's own name (`template.name` / `design.nameEn`)
        //   3. The brand name (`tenant.name` from /admin/settings)
        //
        // Only when ALL are empty do we omit `logoText` entirely and
        // let Apple Wallet hide the title row.
        $hasTitle = trim((string) ($design['labels']['title'] ?? '')) !== ''
            || trim((string) ($design['labels']['titleEn'] ?? '')) !== ''
            || trim((string) ($design['nameEn'] ?? '')) !== ''
            || trim((string) ($template?->name ?? '')) !== ''
            || trim((string) ($tenant?->name ?? '')) !== '';

        // PassKit web service config — iOS Wallet appends `v1/...` to
        // webServiceURL itself, so this MUST end with `/` and point at
        // the API root (not at `/v1`).
        //
        // CRITICAL: Apple REJECTS installation of any pass whose
        // webServiceURL is not HTTPS. So we only emit these two keys
        // when APP_URL is https:// — otherwise the pass falls back to
        // the legacy "download once, never update" behaviour, which
        // is strictly better than refusing to install at all. Use
        // ngrok / Cloudflare Tunnel to expose your dev box over HTTPS
        // when you want to exercise the auto-update path locally.
        $appUrl = (string) config('app.url');
        $isHttps = str_starts_with(strtolower($appUrl), 'https://');

        $passData = [
            'formatVersion' => 1,
            'passTypeIdentifier' => $appleConfig['pass_type_id'] ?? '',
            'teamIdentifier' => $appleConfig['team_id'] ?? '',
            'organizationName' => $organizationName,
            'serialNumber' => $this->card->serial_number,
            'description' => $template->name ?? 'بطاقة ولاء',
            'backgroundColor' => $this->hexToRgb($colors['background'] ?? '#FEF3C7'),
            'foregroundColor' => $this->hexToRgb($colors['foreground'] ?? '#78350F'),
            'labelColor' => $this->hexToRgb($colors['foreground'] ?? '#78350F'),
            'storeCard' => [
                // headerField — GIFT counter shown opposite the logo,
                // mirroring the Alpha Spa pass screenshot. Value is the
                // number of redemptions the customer can claim RIGHT NOW
                // (floor(stamps_count / stamps_required)). The label
                // reuses REWARD_LABEL so the tenant doesn't have to
                // configure two different strings for the same concept.
                //
                // changeMessage: when this field's value changes between
                // pass updates, iOS automatically pops a lock-screen
                // notification using this template. `%@` is replaced
                // with the new value at render time. We localize via
                // pass.strings (CHANGE_GIFTS / CHANGE_STAMPS keys), so
                // Arabic and English iPhones see the right wording.
                'headerFields' => [
                    [
                        'key' => 'gifts',
                        'label' => self::LABEL_KEYS['reward'],
                        'value' => (string) intdiv($this->card->stamps_count, max(1, $stampsRequired)),
                        'changeMessage' => self::LABEL_KEYS['change_gifts'],
                    ],
                ],
                // secondaryFields use string keys (e.g. STAMPS_LABEL)
                // for labels — iOS swaps them for the matching entry in
                // <device-lang>.lproj/pass.strings at render time, so a
                // single pkpass works for both Arabic and English
                // iPhones. The .strings files are written below in
                // `signPkPass()`.
                'secondaryFields' => [
                    [
                        'key' => 'stamps',
                        'label' => self::LABEL_KEYS['stamps'],
                        'value' => "{$this->card->stamps_count}/{$stampsRequired}",
                        'changeMessage' => self::LABEL_KEYS['change_stamps'],
                    ],
                    [
                        'key' => 'name',
                        'label' => self::LABEL_KEYS['customer'],
                        'value' => trim(
                            ($this->card->customer?->first_name ?? '').' '.
                            ($this->card->customer?->last_name ?? ''),
                        ) ?: ($this->card->customer?->phone ?? ''),
                    ],
                ],
                // backFields show in the back of the pass when the user
                // taps the (i) button. We always emit the announcement
                // field — even when empty — so iOS treats subsequent
                // value changes as updates and fires the lock-screen
                // notification. The changeMessage template is just `%@`
                // so the announcement text shows verbatim on the lock
                // screen instead of being prefixed with the field label.
                'backFields' => [
                    [
                        'key' => 'announcement',
                        'label' => self::LABEL_KEYS['announcement'],
                        'value' => (string) ($this->card->announcement_text ?? ''),
                        'changeMessage' => self::LABEL_KEYS['change_announcement'],
                    ],
                ],
            ],
            'barcodes' => [
                [
                    'format' => 'PKBarcodeFormatQR',
                    'message' => $this->card->serial_number,
                    'messageEncoding' => 'iso-8859-1',
                    'altText' => $this->card->serial_number,
                ],
            ],
        ];

        // Only emit logoText when the tenant set a display title — its
        // value is the LOGO_TEXT key, which iOS swaps for the right
        // language at render time via the .strings files.
        if ($hasTitle) {
            $passData['logoText'] = self::LABEL_KEYS['title'];
        }

        // Auto-update keys are conditional on HTTPS — see the long
        // comment near $isHttps above. When omitted, iOS just won't
        // call back to our PassKit web service for this pass.
        if ($isHttps) {
            $passData['webServiceURL'] = rtrim($appUrl, '/').'/api/';
            $passData['authenticationToken'] = $this->card->ensureAppleAuthToken();
        }

        // Geofence locations — Apple Wallet surfaces this pass on the
        // user's lock screen when their phone enters one of the listed
        // location radii. We pull from the `card_template_location`
        // pivot, filter to active branches with valid coordinates, and
        // hard-cap at 10 (Apple's spec).
        $branches = $template?->locations
            ?->filter(fn ($loc) => $loc->is_active && $loc->lat !== null && $loc->lng !== null)
            ?->take(10);

        if ($branches !== null && $branches->isNotEmpty()) {
            $passData['locations'] = $branches->map(fn ($loc) => [
                'latitude' => (float) $loc->lat,
                'longitude' => (float) $loc->lng,
                // Lock-screen welcome text — prefer the per-branch
                // `Location.message`, fall back to the card name.
                'relevantText' => trim((string) $loc->message) !== ''
                    ? (string) $loc->message
                    : (string) ($template->name ?? ''),
            ])->values()->all();

            // Apple's `maxDistance` is a single global value applied to
            // every entry in `locations`. Use the WIDEST radius among
            // the linked branches so a customer near a small branch
            // still gets notified by larger ones with bigger geofences.
            $maxRadius = (int) $branches->max('geofence_radius_m');
            if ($maxRadius > 0) {
                $passData['maxDistance'] = $maxRadius;
            }
        }

        return $passData;
    }

    /**
     * Build, sign, and return the raw .pkpass bytes.
     *
     * @throws RuntimeException when credentials are missing or signing fails
     */
    public function signPkPass(): string
    {
        $cfg = app(PlatformSettingsService::class)->get('wallet.apple');

        if (empty($cfg['pass_type_id']) || empty($cfg['team_id'])) {
            throw new RuntimeException('Apple Wallet: Pass Type ID or Team ID is not set in /op/settings');
        }
        if (empty($cfg['cert_pem']) || empty($cfg['key_pem'])) {
            throw new RuntimeException('Apple Wallet: signing certificate or private key is missing — upload them from /op/settings');
        }

        // Collect every file that goes into the .pkpass ZIP. Start with
        // the JSON, then add the image assets from the bundled defaults
        // (or per-tenant overrides from the template design in future).
        $files = [];
        $files['pass.json'] = json_encode(
            $this->buildPassData(),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        );

        $assetDir = base_path(self::ASSET_DIR);

        // Icons are not customisable per-tenant — they're the small
        // Brand logo + notification icon — single source of truth.
        //
        // Apple Wallet uses `icon.png` (29/58/87 square) for lock-screen
        // notifications and the back-of-pass screen, and `logo.png`
        // (≤160×50 rectangular) for the visible header on the front of
        // the pass. We render BOTH from the same source image so the
        // tenant only uploads their brand once.
        //
        // Source priority (first non-empty wins):
        //   1. `card.template.design.logoUrl`  — per-card override set
        //      from the card editor (rarely used; only when a single
        //      card needs a different logo from the brand default)
        //   2. `tenant.settings.branding.logo` — the brand-wide logo
        //      from /admin/settings → "معلومات النشاط التجاري". This
        //      is the normal source for every card.
        //   3. Bundled "S" defaults                — last-resort fallback
        //      so the pkpass still installs even if the tenant hasn't
        //      uploaded anything (Apple REQUIRES icon.png to be present
        //      or the pass install fails outright).
        // Make sure the template + tenant relations are loaded — we
        // can't rely on `buildPassData()` having been called first
        // because `signPkPass()` is sometimes invoked directly.
        $this->card->loadMissing(['template.tenant']);
        $tenantDesign = $this->card->template?->design ?? [];
        $perCardOverride = $tenantDesign['logoUrl'] ?? null;
        $brandLogo = data_get($this->card->template?->tenant?->settings, 'branding.logo');
        $logoSource = $perCardOverride ?: $brandLogo;

        $tenantLogos = null;
        $tenantIcons = null;
        if ($logoSource) {
            $tenantLogos = $this->renderTenantLogos($logoSource);
            $tenantIcons = $this->renderTenantIcons($logoSource);
        }

        // icon.png — required by Apple. Tenant logo first, bundled
        // default as fallback so the pass always installs.
        foreach (['icon.png' => 1, 'icon@2x.png' => 2, 'icon@3x.png' => 3] as $name => $scale) {
            if ($tenantIcons !== null && isset($tenantIcons[$scale])) {
                $files[$name] = $tenantIcons[$scale];
                continue;
            }
            $path = $assetDir.DIRECTORY_SEPARATOR.$name;
            if (is_file($path)) {
                $files[$name] = file_get_contents($path);
            }
        }

        // logo.png — optional. Only ship when the tenant uploaded one;
        // when missing, Apple Wallet hides the logo box entirely.
        if ($tenantLogos !== null) {
            foreach (['logo.png' => 1, 'logo@2x.png' => 2, 'logo@3x.png' => 3] as $name => $scale) {
                if (isset($tenantLogos[$scale])) {
                    $files[$name] = $tenantLogos[$scale];
                }
            }
        }

        // Dynamic strip.png — visual stamp grid drawn with the tenant's
        // colors and Lucide stamp icons. Apple's storeCard schema has no
        // native stamp widget, so this image is the only way to show the
        // punch-card grid the way customers expect.
        $template = $this->card->template;
        $design = $template?->design ?? [];
        $reward = $template?->rewards->first();
        $stampsRequired = $reward?->stamps_required ?? 10;
        // Match CardVisual: the grid is sized by design.stampsCount, not by
        // the reward's stamps_required (they can differ).
        $gridCount = (int) ($design['stampsCount'] ?? $stampsRequired);
        $collected = (int) $this->card->stamps_count;

        foreach ([['strip.png', 1], ['strip@2x.png', 2], ['strip@3x.png', 3]] as [$name, $scale]) {
            $files[$name] = $this->generateStripImage($collected, $gridCount, $design, $scale);
        }

        // Localised label files. Apple Wallet picks the .strings file
        // matching the device's primary language, falling back to the
        // pass's `defaultLanguage` (we don't set one, so iOS uses Arabic
        // for ar-* devices and English for everything else).
        $files['ar.lproj/pass.strings'] = $this->buildStringsFile($design, 'ar');
        $files['en.lproj/pass.strings'] = $this->buildStringsFile($design, 'en');

        // manifest.json: SHA-1 of every file, keyed by filename.
        $manifest = [];
        foreach ($files as $name => $bytes) {
            $manifest[$name] = sha1($bytes);
        }
        $manifestJson = json_encode((object) $manifest);
        $files['manifest.json'] = $manifestJson;

        // signature: detached PKCS#7 signature of manifest.json, signed by
        // the Pass Type ID cert, chained to Apple's WWDR intermediate.
        $files['signature'] = $this->signManifest($manifestJson, $cfg);

        // Zip everything into a single .pkpass buffer.
        return $this->zipFiles($files);
    }

    /**
     * Produce a DER-encoded detached PKCS#7 signature of `manifest.json`,
     * signed by the Pass Type ID cert, chained to the WWDR intermediate.
     *
     * Apple requires the signature to be in DER format, not the PEM output
     * that `openssl_pkcs7_sign()` writes by default — we convert it after.
     */
    private function signManifest(string $manifest, array $cfg): string
    {
        // openssl_pkcs7_sign needs real files on disk for each input.
        $tmpDir = sys_get_temp_dir();
        $manifestFile = tempnam($tmpDir, 'stamply-manifest');
        $certFile = tempnam($tmpDir, 'stamply-cert');
        $keyFile = tempnam($tmpDir, 'stamply-key');
        $wwdrFile = tempnam($tmpDir, 'stamply-wwdr');
        $signatureFile = tempnam($tmpDir, 'stamply-sig');

        // WWDR cert: prefer operator override, fall back to bundled copy.
        $wwdr = $cfg['wwdr_cert_pem']
            ?? file_get_contents(base_path(self::ASSET_DIR.'/wwdr-g4.pem'));
        if (! $wwdr) {
            throw new RuntimeException('Apple Wallet: WWDR intermediate certificate not found');
        }

        try {
            file_put_contents($manifestFile, $manifest);
            file_put_contents($certFile, $cfg['cert_pem']);
            file_put_contents($keyFile, $cfg['key_pem']);
            file_put_contents($wwdrFile, $wwdr);

            // PHP's openssl_pkcs7_sign requires the `file://` URI form
            // for both cert and key paths on PHP 8.4 — raw paths fail
            // with "DECODER routines::unsupported". Inline PEM strings
            // also work, but file URIs keep the secret off the PHP call
            // stack.
            $keyArg = empty($cfg['key_password'])
                ? 'file://'.$keyFile
                : ['file://'.$keyFile, $cfg['key_password']];

            // Detached signature — PKCS7_DETACHED + PKCS7_BINARY.
            $ok = openssl_pkcs7_sign(
                $manifestFile,
                $signatureFile,
                'file://'.$certFile,
                $keyArg,
                [],
                PKCS7_DETACHED | PKCS7_BINARY,
                $wwdrFile,
            );

            if (! $ok) {
                $err = '';
                while ($line = openssl_error_string()) {
                    $err .= $line.' ';
                }
                throw new RuntimeException(
                    'Apple Wallet: failed to sign pass — '.($err ?: 'unknown openssl error'),
                );
            }

            $signedPem = file_get_contents($signatureFile);

            return $this->pemSignatureToDer($signedPem);
        } finally {
            // Shred temp files.
            foreach ([$manifestFile, $certFile, $keyFile, $wwdrFile, $signatureFile] as $f) {
                if ($f && file_exists($f)) {
                    @unlink($f);
                }
            }
        }
    }

    /**
     * openssl_pkcs7_sign writes a S/MIME multipart message. For a .pkpass
     * we need the raw DER bytes of the pkcs7-signature part. Parse the
     * MIME structure, find the signature part, base64-decode its body.
     *
     * Format (simplified):
     *   MIME-Version: 1.0
     *   Content-Type: multipart/signed; boundary="----BOUNDARY"
     *
     *   ------BOUNDARY
     *   ...first part (the manifest content)...
     *   ------BOUNDARY
     *   Content-Type: application/x-pkcs7-signature; name="smime.p7s"
     *   Content-Transfer-Encoding: base64
     *   Content-Disposition: attachment; filename="smime.p7s"
     *
     *   <base64 lines>
     *   ------BOUNDARY--
     */
    private function pemSignatureToDer(string $pem): string
    {
        // Normalise line endings so regex quantifiers behave consistently.
        $pem = str_replace("\r\n", "\n", $pem);

        // 1. Extract the MIME boundary from the top-level Content-Type.
        if (! preg_match('/boundary="?([^";\n]+)"?/', $pem, $bm)) {
            throw new RuntimeException('Apple Wallet: MIME boundary not found in signature output');
        }
        $boundary = $bm[1];

        // 2. Find the section that carries `application/x-pkcs7-signature`.
        //    Headers end at the first empty line; body ends at the next
        //    boundary marker (`--BOUNDARY` or `--BOUNDARY--`).
        $pattern = '/Content-Type:\s*application\/x-pkcs7-signature.*?\n\n(.*?)\n--'.preg_quote($boundary, '/').'/s';
        if (! preg_match($pattern, $pem, $sm)) {
            throw new RuntimeException('Apple Wallet: pkcs7-signature part not found in signature output');
        }

        $der = base64_decode(preg_replace('/\s+/', '', $sm[1]), true);
        if ($der === false || $der === '') {
            throw new RuntimeException('Apple Wallet: invalid base64 in pkcs7-signature body');
        }

        return $der;
    }

    /**
     * Stream an in-memory associative array of [filename => bytes] into a
     * single ZIP buffer — the .pkpass binary.
     */
    private function zipFiles(array $files): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'stamply-pkpass');
        try {
            $zip = new ZipArchive();
            if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException('Apple Wallet: could not create pkpass archive');
            }
            foreach ($files as $name => $bytes) {
                $zip->addFromString($name, $bytes);
            }
            $zip->close();

            return file_get_contents($tmp);
        } finally {
            if (file_exists($tmp)) {
                @unlink($tmp);
            }
        }
    }

    /**
     * Pull a customisable label from `design.labels` for a specific
     * language. `$key` is one of title/stamps/reward/customer; `$lang`
     * is 'ar' or 'en'. Returns the empty string when no value is set
     * AND there's no default — used by `title`, which is optional.
     *
     * For English, if the tenant didn't supply a translation we fall
     * back to the Arabic value (so the .strings file always has SOME
     * value, never an empty entry — unless BOTH are empty, in which
     * case we return '').
     */
    private function resolveLabel(array $design, string $key, string $lang = 'ar'): string
    {
        $labels = $design['labels'] ?? [];
        $field = $lang === 'en' ? $key.'En' : $key;
        $raw = (string) ($labels[$field] ?? '');
        $value = trim($raw);

        if ($value === '') {
            if ($lang === 'en') {
                // Fall back to the Arabic variant first.
                $arabic = trim((string) ($labels[$key] ?? ''));
                if ($arabic !== '') {
                    $value = $arabic;
                } else {
                    // Then to the English default — which may be missing
                    // for keys like `title` that have no default.
                    $value = self::DEFAULT_LABELS[$key.'En'] ?? '';
                }
            } else {
                $value = self::DEFAULT_LABELS[$key] ?? '';
            }
        }

        // Special case: `title` (LOGO_TEXT in pass.json) — fallback
        // chain when the tenant didn't override it via design.labels:
        //   1. The CARD's own name (`template.name` for Arabic, the
        //      English variant when iOS asks for en.lproj). Each card
        //      has its own identity ("بطاقة العيد"…) and the pass
        //      title should reflect the specific card.
        //   2. The BRAND name (`tenant.name`) when the merchant didn't
        //      bother filling in a card-level name — better than
        //      showing a blank logoText, and matches what they'd want
        //      on a lock-screen notification.
        if ($key === 'title' && $value === '') {
            $template = $this->card->template;
            $design = $template?->design ?? [];

            if ($lang === 'en') {
                // Per-card English name lives on `design.nameEn` since
                // `card_templates.name` is the canonical Arabic field.
                $cardName = trim((string) ($design['nameEn'] ?? ''));
                if ($cardName === '') {
                    $cardName = trim((string) ($template?->name ?? ''));
                }
            } else {
                $cardName = trim((string) ($template?->name ?? ''));
            }

            if ($cardName !== '') {
                $value = $cardName;
            } else {
                // Last-resort fallback to the brand name from
                // /admin/settings → "معلومات النشاط التجاري".
                $value = trim((string) ($template?->tenant?->name ?? ''));
            }
        }

        $limit = self::LABEL_LIMITS[$key] ?? null;
        if ($limit !== null && mb_strlen($value) > $limit) {
            return mb_substr($value, 0, $limit);
        }

        return $value;
    }

    /**
     * Build the contents of `<lang>.lproj/pass.strings`. Format follows
     * Apple's strings file spec: one `"key" = "value";` per line. The
     * keys must match what we set as `label` (or `logoText`) in
     * pass.json (see the `LABEL_KEYS` constant).
     *
     * Optional keys with empty resolved values (e.g. `title` when the
     * tenant left both Arabic and English blank) are skipped — Apple
     * Wallet then renders no logoText row at all on the device.
     */
    private function buildStringsFile(array $design, string $lang): string
    {
        $lines = [];
        foreach (self::LABEL_KEYS as $key => $stringKey) {
            $value = $this->resolveLabel($design, $key, $lang);
            if ($value === '') {
                continue;
            }
            // Escape double-quotes and backslashes per the .strings spec.
            $escaped = str_replace(['\\', '"'], ['\\\\', '\\"'], $value);
            $lines[] = sprintf('"%s" = "%s";', $stringKey, $escaped);
        }

        // .strings files must be UTF-8 with a BOM for non-ASCII content
        // to render correctly across iOS versions.
        return "\xEF\xBB\xBF".implode("\n", $lines)."\n";
    }

    /**
     * Render a stamp grid as a PNG strip image. Apple's store card has no
     * native "punch card" widget — the only way to show filled vs empty
     * stamps visually is to bake them into the strip.png that sits above
     * the barcode.
     *
     * Strip dimensions for a storeCard with a square barcode (QR/Aztec) at
     * 1x: 375 × 123. Wrong ratio → Wallet stretches and clips the sides.
     *
     * The grid layout is computed dynamically: for each candidate row count
     * (1 → 5) we figure out the implied column count and pick whichever
     * combination produces the largest possible circle diameter inside the
     * available area. This way 1, 2, 3, 6, 8, 10, 15, 20, 30 stamps each
     * get a layout tailored to their count instead of being forced into a
     * fixed 5-column grid.
     *
     * When the resulting diameter is too small to legibly contain a Lucide
     * icon (< 36 px at 1x), we drop the icon and draw a slightly thicker
     * outlined / filled circle instead — readable down to ~25 px.
     *
     * RTL ordering: stamp #1 starts at the right edge and progresses
     * leftwards, mirroring the in-app `<CardVisual>` which is rendered
     * inside an RTL document.
     */
    private function generateStripImage(int $collected, int $required, array $design, int $scale): string
    {
        // Apple's storeCard + square-barcode strip dimensions.
        $w = 375 * $scale;
        $h = 123 * $scale;

        $colors = $design['colors'] ?? [];
        $stampsBg = $colors['stampsBackground'] ?? '#FCD34D';
        $activeColor = $colors['activeStamp'] ?? ($colors['foreground'] ?? '#78350F');
        $inactiveColor = $colors['inactiveStamp'] ?? '#FDE68A';
        $activeIcon = $design['activeStampIcon'] ?? 'Stamp';
        $inactiveIcon = $design['inactiveStampIcon'] ?? $activeIcon;

        $required = max(1, min(30, $required));
        $collected = max(0, min($collected, $required));

        // Transparent outer canvas — Apple Wallet composites the strip over
        // the pass body color, so transparent edges blend correctly.
        $im = new Imagick();
        $im->newImage($w, $h, new ImagickPixel('transparent'), 'png');
        $im->setImageFormat('png32');

        // Rounded "stamps area" matching CardVisual's `rounded-xl p-3`.
        $padX = 12 * $scale;
        $padY = 8 * $scale;
        $radius = 14 * $scale;
        $bg = new ImagickDraw();
        $bg->setFillColor(new ImagickPixel($stampsBg));
        $bg->roundRectangle($padX, $padY, $w - $padX, $h - $padY, $radius, $radius);
        $im->drawImage($bg);

        // Inner area available for circles. Tighter padding for very
        // dense grids (≥18 stamps) — otherwise we keep the same padding
        // for every count so n=6, 7, 8 produce circles big enough to
        // host an icon (i.e. they stay in FULL mode and don't fall back
        // to plain dots).
        $innerPad = ($required >= 18 ? 6 : 8) * $scale;
        $gridX = $padX + $innerPad;
        $gridY = $padY + $innerPad;
        $gridW = $w - 2 * ($padX + $innerPad);
        $gridH = $h - 2 * ($padY + $innerPad);

        // Pick the (rows, cols) combination that maximises circle diameter.
        [$rows, $cols, $diameter] = $this->pickOptimalGrid($required, $gridW, $gridH);

        // For small counts, cap the diameter so a 1- or 2-stamp card doesn't
        // produce absurdly large circles. ~70 px (1x) is the upper bound
        // that still feels like a "stamp" rather than a button.
        $diameterCap = 70 * $scale;
        $diameter = (int) min($diameter, $diameterCap);

        // Mode: full = circle + Lucide icon. simple = circle only (filled
        // for collected, hollow for remaining). Threshold ≈ 36 px at 1x —
        // smaller than that the icon becomes a fuzzy blob and hurts more
        // than it helps.
        $modeFull = $diameter >= 36 * $scale;
        $strokeW = max(2, (int) ($scale * ($modeFull ? 2.5 : 3.2)));

        // Pre-rasterize icons once if we're in full mode.
        $activeIconBytes = null;
        $inactiveIconBytes = null;
        if ($modeFull) {
            $iconSize = (int) ($diameter * 0.55);
            $activeIconBytes = $this->rasterizeStampIcon($activeIcon, $activeColor, $iconSize);
            $inactiveIconBytes = $this->rasterizeStampIcon($inactiveIcon, $inactiveColor, $iconSize);
        }

        // Vertical centring of the entire grid block inside the available
        // height. Otherwise short rows hug the top edge.
        $blockH = $rows * $diameter + ($rows - 1) * ($diameter * 0.25);
        $blockY = $gridY + ($gridH - $blockH) / 2;
        $rowGap = $rows > 1 ? ($gridH - $rows * $diameter) / ($rows - 1) : 0;
        // Don't let rows drift apart absurdly when there's lots of vertical
        // slack — clamp the gap so circles stay visually grouped.
        $rowGap = min($rowGap, $diameter * 0.45);
        $blockH = $rows * $diameter + ($rows - 1) * $rowGap;
        $blockY = $gridY + ($gridH - $blockH) / 2;

        for ($i = 0; $i < $required; $i++) {
            $row = (int) floor($i / $cols);
            $col = $i % $cols;

            // How many circles are in THIS row (handles a partial last row).
            $itemsInRow = ($row === $rows - 1)
                ? ($required - $row * $cols)
                : $cols;

            // Centre the row's items horizontally — the partial last row
            // sits centred under the rows above instead of clinging to one
            // edge.
            $rowBlockW = $itemsInRow * $diameter + ($itemsInRow - 1) * (($itemsInRow > 1) ? (($gridW - $itemsInRow * $diameter) / max(1, $itemsInRow - 1)) : 0);
            $colGap = $itemsInRow > 1 ? min(($gridW - $itemsInRow * $diameter) / ($itemsInRow - 1), $diameter * 0.55) : 0;
            $rowBlockW = $itemsInRow * $diameter + ($itemsInRow - 1) * $colGap;
            $rowStartX = $gridX + ($gridW - $rowBlockW) / 2;

            // RTL: stamp index 0 (the first one collected) sits on the
            // RIGHT, just like the in-app CardVisual which lives inside an
            // RTL document. The visual position is mirrored from `col`.
            $visualCol = $itemsInRow - 1 - $col;
            $cx = $rowStartX + $visualCol * ($diameter + $colGap) + $diameter / 2;
            $cy = $blockY + $row * ($diameter + $rowGap) + $diameter / 2;
            $r = $diameter / 2;

            $isCollected = $i < $collected;
            $borderColor = $isCollected ? $activeColor : $inactiveColor;

            // In simple mode, collected = filled disc, remaining = ring.
            // In full mode, both are rings (icon distinguishes them).
            $circle = new ImagickDraw();
            if (! $modeFull && $isCollected) {
                $circle->setFillColor(new ImagickPixel($activeColor));
                $circle->setStrokeColor(new ImagickPixel($activeColor));
            } else {
                $circle->setFillColor(new ImagickPixel('transparent'));
                $circle->setStrokeColor(new ImagickPixel($borderColor));
            }
            $circle->setStrokeWidth($strokeW);
            $circle->ellipse($cx, $cy, $r, $r, 0, 360);
            $im->drawImage($circle);

            if ($modeFull) {
                $iconBytes = $isCollected ? $activeIconBytes : $inactiveIconBytes;
                if ($iconBytes !== null) {
                    $icon = new Imagick();
                    $icon->readImageBlob($iconBytes);
                    if (! $isCollected) {
                        // ImageMagick 7 removed setImageOpacity; multiply
                        // the alpha channel by 0.5 to mimic 50% opacity
                        // (matches CardVisual's inactive stamp styling).
                        $icon->evaluateImage(Imagick::EVALUATE_MULTIPLY, 0.5, Imagick::CHANNEL_ALPHA);
                    }
                    $im->compositeImage(
                        $icon,
                        Imagick::COMPOSITE_OVER,
                        (int) ($cx - $iconSize / 2),
                        (int) ($cy - $iconSize / 2),
                    );
                    $icon->destroy();
                }
            }
        }

        $bytes = $im->getImageBlob();
        $im->destroy();

        return $bytes;
    }

    /**
     * Pick the (rows, cols) layout for the stamp grid.
     *
     * For most counts we run an optimisation pass: try every row count
     * 1..5, derive `cols = ceil(N/rows)`, compute the resulting circle
     * diameter, and keep the combo with the biggest circle.
     *
     * A handful of small even/near-even counts have a HARD-CODED layout
     * because the optimiser would otherwise pick a single long row that
     * looks unbalanced for these specific counts. The user explicitly
     * asked for these arrangements:
     *   - n=6  → 2 rows of 3 (instead of 1×6)
     *   - n=7  → row of 4 + row of 3 (instead of 1×7)
     *
     * Returns `[rows, cols, diameter]`.
     */
    private function pickOptimalGrid(int $required, float $gridW, float $gridH): array
    {
        // Spacing factor: leave room for gaps between circles. 0.85 means
        // each circle takes 85% of its cell, leaving 15% for the gap.
        $spacingFactor = 0.85;

        // Hand-tuned overrides — keep them in sync with the matching
        // table in the web `pickStampGrid()` helper.
        $overrides = [
            6 => [2, 3], // 3 + 3
            7 => [2, 4], // 4 + 3 (the last row centres itself)
        ];

        if (isset($overrides[$required])) {
            [$rows, $cols] = $overrides[$required];
            $cellW = $gridW / $cols;
            $cellH = $gridH / $rows;
            $diameter = min($cellW, $cellH) * $spacingFactor;

            return [$rows, $cols, (int) $diameter];
        }

        $best = [1, $required, 0];
        // Cap rows at 5 — beyond that the circles are too small to be
        // meaningful even with our simple-mode fallback.
        for ($rows = 1; $rows <= min(5, $required); $rows++) {
            $cols = (int) ceil($required / $rows);
            $cellW = $gridW / $cols;
            $cellH = $gridH / $rows;
            $diameter = min($cellW, $cellH) * $spacingFactor;
            if ($diameter > $best[2]) {
                $best = [$rows, $cols, $diameter];
            }
        }

        return [$best[0], $best[1], (int) $best[2]];
    }

    /**
     * Rasterize a stamp icon to PNG bytes at the requested square size.
     *
     * Two icon flavors matching the editor:
     *   - PascalCase Lucide name ("Coffee", "IceCream", "PawPrint") →
     *     parse the bundled SVG, extract every `<path d="..."/>`, then
     *     render via raw MVG (Magick Vector Graphics) which accepts SVG
     *     path syntax verbatim. Imagick's bundled MSVG decoder is too
     *     limited for stroke-only icons, but MVG handles them perfectly.
     *   - data: base64 image URI (custom uploaded icon) → decoded and
     *     resized directly.
     *
     * Returns null on miss so the caller falls back to an empty circle.
     */
    private function rasterizeStampIcon(string $icon, string $hexColor, int $size): ?string
    {
        if ($size <= 0) {
            return null;
        }

        // Custom uploaded icon (base64 data URI).
        if (str_starts_with($icon, 'data:')) {
            $comma = strpos($icon, ',');
            if ($comma === false) {
                return null;
            }
            $raw = base64_decode(substr($icon, $comma + 1), true);
            if ($raw === false) {
                return null;
            }
            try {
                $im = new Imagick();
                $im->readImageBlob($raw);
                $im->setImageFormat('png32');
                $im->resizeImage($size, $size, Imagick::FILTER_LANCZOS, 1);
                $bytes = $im->getImageBlob();
                $im->destroy();

                return $bytes;
            } catch (\Throwable) {
                return null;
            }
        }

        // Lucide icon — convert PascalCase → kebab-case (Coffee → coffee,
        // IceCream → ice-cream, Flower2 → flower-2, PawPrint → paw-print).
        $kebab = strtolower(preg_replace('/(?<!^)([A-Z]|\d)/', '-$1', $icon));
        $svgPath = base_path(self::ASSET_DIR.'/../lucide/'.$kebab.'.svg');
        if (! is_file($svgPath)) {
            return null;
        }

        $svg = file_get_contents($svgPath);

        // Pull every <path d="..."/> out of the SVG. Lucide icons also use
        // <circle>, <rect>, <line>, <polyline>, and <polygon>; we handle
        // each by translating to an MVG primitive.
        if (! preg_match_all('/<(path|circle|rect|line|polyline|polygon)\b([^>]*)\/?>/', $svg, $matches, PREG_SET_ORDER)) {
            return null;
        }

        $primitives = [];
        foreach ($matches as $m) {
            $tag = $m[1];
            $attrs = $m[2];
            switch ($tag) {
                case 'path':
                    if (preg_match('/\bd="([^"]+)"/', $attrs, $a)) {
                        $primitives[] = "path \"".str_replace('"', "'", $a[1])."\"";
                    }
                    break;
                case 'circle':
                    if (preg_match('/\bcx="([\d.\-]+)"/', $attrs, $cx)
                        && preg_match('/\bcy="([\d.\-]+)"/', $attrs, $cy)
                        && preg_match('/\br="([\d.\-]+)"/', $attrs, $r)
                    ) {
                        $primitives[] = "circle {$cx[1]},{$cy[1]} ".($cx[1] + $r[1]).",{$cy[1]}";
                    }
                    break;
                case 'rect':
                    if (preg_match('/\bx="([\d.\-]+)"/', $attrs, $x)
                        && preg_match('/\by="([\d.\-]+)"/', $attrs, $y)
                        && preg_match('/\bwidth="([\d.\-]+)"/', $attrs, $w)
                        && preg_match('/\bheight="([\d.\-]+)"/', $attrs, $h)
                    ) {
                        $rx = preg_match('/\brx="([\d.\-]+)"/', $attrs, $rxm) ? $rxm[1] : 0;
                        $primitive = $rx > 0
                            ? "roundrectangle {$x[1]},{$y[1]} ".($x[1] + $w[1]).",".($y[1] + $h[1])." {$rx},{$rx}"
                            : "rectangle {$x[1]},{$y[1]} ".($x[1] + $w[1]).",".($y[1] + $h[1]);
                        $primitives[] = $primitive;
                    }
                    break;
                case 'line':
                    if (preg_match('/\bx1="([\d.\-]+)"/', $attrs, $x1)
                        && preg_match('/\by1="([\d.\-]+)"/', $attrs, $y1)
                        && preg_match('/\bx2="([\d.\-]+)"/', $attrs, $x2)
                        && preg_match('/\by2="([\d.\-]+)"/', $attrs, $y2)
                    ) {
                        $primitives[] = "line {$x1[1]},{$y1[1]} {$x2[1]},{$y2[1]}";
                    }
                    break;
                case 'polyline':
                case 'polygon':
                    if (preg_match('/\bpoints="([^"]+)"/', $attrs, $pts)) {
                        $kw = $tag === 'polygon' ? 'polygon' : 'polyline';
                        $primitives[] = "$kw ".trim($pts[1]);
                    }
                    break;
            }
        }

        if (empty($primitives)) {
            return null;
        }

        // Lucide icons live in a 24×24 viewbox. Render at the target size
        // and scale the path coordinates to match. Stroke width 2 in the
        // 24-unit space — bumped slightly for legibility at small sizes.
        $scale = $size / 24;
        $strokeWidth = 2.2;

        $mvg = "viewbox 0 0 {$size} {$size}\n";
        $mvg .= "fill none\n";
        $mvg .= "stroke '{$hexColor}'\n";
        $mvg .= "stroke-width {$strokeWidth}\n";
        $mvg .= "stroke-linecap round\n";
        $mvg .= "stroke-linejoin round\n";
        $mvg .= "scale {$scale},{$scale}\n";
        $mvg .= implode("\n", $primitives)."\n";

        $tmp = tempnam(sys_get_temp_dir(), 'stamp-mvg').'.mvg';
        try {
            file_put_contents($tmp, $mvg);
            $im = new Imagick();
            $im->setBackgroundColor(new ImagickPixel('transparent'));
            $im->readImage('mvg:'.$tmp);
            $im->setImageFormat('png32');
            $bytes = $im->getImageBlob();
            $im->destroy();

            return $bytes;
        } catch (\Throwable) {
            return null;
        } finally {
            if (file_exists($tmp)) {
                @unlink($tmp);
            }
        }
    }

    /**
     * Rasterize a tenant-supplied logo (data URL or HTTP URL) to the
     * three logo.png sizes Apple Wallet expects.
     *
     * Apple's official logo dimensions for a storeCard:
     *   - logo.png    width ≤ 160, height ≤ 50
     *   - logo@2x.png width ≤ 320, height ≤ 100
     *   - logo@3x.png width ≤ 480, height ≤ 150
     *
     * We accept any image (PNG/JPG/WebP/SVG) and resize it to fit inside
     * the 1× box while preserving the aspect ratio. The 2× and 3× variants
     * are re-rasterized at higher resolution from the original to keep
     * the logo crisp on Retina screens.
     *
     * @return array<int, string>|null Map of scale (1/2/3) → PNG bytes,
     *                                 or null if the source can't be read.
     */
    private function renderTenantLogos(string $source): ?array
    {
        // Decode data URL or fetch HTTP URL into raw bytes.
        $raw = null;
        if (str_starts_with($source, 'data:')) {
            $comma = strpos($source, ',');
            if ($comma === false) {
                return null;
            }
            $raw = base64_decode(substr($source, $comma + 1), true);
            if ($raw === false) {
                return null;
            }
        } elseif (preg_match('#^https?://#i', $source)) {
            $ctx = stream_context_create([
                'http' => ['timeout' => 5, 'follow_location' => 1],
            ]);
            $raw = @file_get_contents($source, false, $ctx);
            if ($raw === false || $raw === '') {
                return null;
            }
        } else {
            return null;
        }

        $out = [];
        try {
            // Apple's max box at 1×.
            $boxW = 160;
            $boxH = 50;
            foreach ([1, 2, 3] as $scale) {
                $im = new Imagick();
                $im->setBackgroundColor(new ImagickPixel('transparent'));
                $im->readImageBlob($raw);
                $im->setImageFormat('png32');

                // Resize to fit inside the (boxW × boxH) × scale box,
                // preserving aspect ratio. `bestfit=true` does the math.
                $im->resizeImage($boxW * $scale, $boxH * $scale, Imagick::FILTER_LANCZOS, 1, true);

                $out[$scale] = $im->getImageBlob();
                $im->destroy();
            }
        } catch (\Throwable) {
            return null;
        }

        return $out;
    }

    /**
     * Rasterize the tenant-supplied logo to the three SQUARE icon.png
     * sizes Apple Wallet uses for lock-screen notifications and the
     * pass back-of-card screen.
     *
     * Apple's official icon dimensions:
     *   - icon.png    29 × 29
     *   - icon@2x.png 58 × 58
     *   - icon@3x.png 87 × 87
     *
     * The source logo is usually rectangular (a wordmark or wide brand
     * mark), so we letterbox it inside the square with a transparent
     * background — preserving aspect ratio. This way a wide logo like
     * "ALPHA SPA & WELLNESS" still appears recognisably without being
     * stretched into a square.
     *
     * @return array<int, string>|null Map of scale (1/2/3) → PNG bytes,
     *                                 or null if the source can't be read.
     */
    private function renderTenantIcons(string $source): ?array
    {
        // Decode data URL or fetch HTTP URL into raw bytes — same path
        // as renderTenantLogos().
        $raw = null;
        if (str_starts_with($source, 'data:')) {
            $comma = strpos($source, ',');
            if ($comma === false) {
                return null;
            }
            $raw = base64_decode(substr($source, $comma + 1), true);
            if ($raw === false) {
                return null;
            }
        } elseif (preg_match('#^https?://#i', $source)) {
            $ctx = stream_context_create([
                'http' => ['timeout' => 5, 'follow_location' => 1],
            ]);
            $raw = @file_get_contents($source, false, $ctx);
            if ($raw === false || $raw === '') {
                return null;
            }
        } else {
            return null;
        }

        $out = [];
        try {
            $base = 29;
            foreach ([1, 2, 3] as $scale) {
                $size = $base * $scale;

                // Render the logo into a transparent square canvas,
                // letterboxed (bestfit=true) to preserve its aspect.
                $logo = new Imagick();
                $logo->setBackgroundColor(new ImagickPixel('transparent'));
                $logo->readImageBlob($raw);
                $logo->setImageFormat('png32');
                // Inner padding so the logo doesn't kiss the canvas
                // edges — 88% of the canvas, 6% padding on each side.
                $inner = (int) round($size * 0.88);
                $logo->resizeImage($inner, $inner, Imagick::FILTER_LANCZOS, 1, true);

                $canvas = new Imagick();
                $canvas->newImage($size, $size, new ImagickPixel('transparent'), 'png');
                $canvas->setImageFormat('png32');
                $canvas->compositeImage(
                    $logo,
                    Imagick::COMPOSITE_OVER,
                    (int) (($size - $logo->getImageWidth()) / 2),
                    (int) (($size - $logo->getImageHeight()) / 2),
                );

                $out[$scale] = $canvas->getImageBlob();
                $canvas->destroy();
                $logo->destroy();
            }
        } catch (\Throwable) {
            return null;
        }

        return $out;
    }

    /** Convert #RRGGBB to PassKit's "rgb(r,g,b)" color format. */
    private function hexToRgb(string $hex): string
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return "rgb({$r},{$g},{$b})";
    }
}
