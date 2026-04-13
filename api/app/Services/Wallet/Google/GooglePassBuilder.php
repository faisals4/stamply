<?php

namespace App\Services\Wallet\Google;

use App\Models\IssuedCard;
use App\Services\PlatformSettingsService;
use RuntimeException;

/**
 * Builds the JSON payloads Google Wallet expects for a Stamply loyalty
 * card, and drives the full save / update / message flow through
 * {@see GoogleApiClient}.
 *
 * Google Wallet uses two resources per card:
 *
 *   - `loyaltyClass` — one per `CardTemplate`. Defines branding,
 *     program name, issuer, colors, logo. Shared across every card
 *     issued from the same template.
 *
 *   - `loyaltyObject` — one per `IssuedCard`. Holds per-customer
 *     state: accountId, accountName, loyaltyPoints balance, barcode,
 *     and the linked locations (geofence). This is the thing that
 *     gets pushed to the customer's phone.
 *
 * Source priority for branding (mirrors `ApplePassBuilder`):
 *   1. Per-card override (`template.design.logoUrl`)
 *   2. Brand logo from `/admin/settings` (tenant.settings.branding.logo)
 *   3. Nothing — Google will render a plain card
 *
 * Location / geofence entries mirror the ones we ship to Apple Wallet:
 * the same `card_template_location` pivot feeds both platforms so an
 * iPhone and an Android user of the same card see notifications from
 * the same set of branches.
 */
class GooglePassBuilder
{
    public function __construct(
        private readonly IssuedCard $card,
        private readonly GoogleApiClient $api,
        private readonly PlatformSettingsService $settings,
    ) {}

    /**
     * Compose and persist the class + object in Google's backend,
     * then return a signed "Save to Google Wallet" URL the customer
     * can click to add the pass to their Android wallet.
     */
    public function buildSaveUrl(): string
    {
        $this->card->loadMissing([
            'template.rewards',
            'template.tenant',
            'template.locations',
            // Profile carries first_name / last_name / phone used
            // in the loyalty object's secondary text fields.
            'customer.profile',
        ]);

        $class = $this->buildLoyaltyClass();
        $object = $this->buildLoyaltyObject();

        // Upsert in order: class must exist before the object references it.
        $this->api->upsertLoyaltyClass($class);
        $this->api->upsertLoyaltyObject($object);

        // The save JWT carries only the OBJECT id — Google re-reads
        // the class server-side from the id reference.
        $jwt = $this->api->signSaveJwt([
            'id' => $object['id'],
            'classId' => $object['classId'],
        ]);

        return "https://pay.google.com/gp/v/save/{$jwt}";
    }

    /**
     * Upsert just the object (no save URL). Used by the background
     * refresh path — when a card's design/colors/stamps change we
     * want Google's server-side copy to reflect the new state
     * without needing the customer to reinstall the pass.
     */
    public function pushLatestState(): void
    {
        $this->card->loadMissing([
            'template.rewards',
            'template.tenant',
            'template.locations',
            // Profile carries first_name / last_name / phone used
            // in the loyalty object's secondary text fields.
            'customer.profile',
        ]);

        $this->api->upsertLoyaltyClass($this->buildLoyaltyClass());
        $this->api->upsertLoyaltyObject($this->buildLoyaltyObject());
    }

    /**
     * Fire an announcement on the Android lock screen. Unlike Apple
     * Wallet, Google Wallet announcements DO produce sound + vibration
     * by default — this is an actual push notification, not a passive
     * back-field update.
     *
     * The message body is capped to 320 chars (Google's limit).
     */
    public function sendAnnouncement(string $text): void
    {
        $title = $this->card->template?->name ?? 'تحديث البطاقة';
        $this->api->addObjectMessage($this->objectId(), $title, $text);
    }

    /**
     * Build the loyaltyClass JSON.
     * Reference: https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyclass
     */
    public function buildLoyaltyClass(): array
    {
        $template = $this->card->template;
        $design = $template->design ?? [];
        $colors = $design['colors'] ?? [];
        $tenant = $template->tenant;

        // Single source of truth for the brand logo — matches Apple side.
        $perCardOverride = $design['logoUrl'] ?? null;
        $brandLogo = data_get($tenant?->settings, 'branding.logo');
        $logoUrl = $perCardOverride ?: $brandLogo;

        $class = [
            'id' => $this->classId(),
            'issuerName' => $tenant?->name ?? 'Stamply',
            'programName' => $template->name ?? 'بطاقة ولاء',
            'hexBackgroundColor' => $this->normaliseHex($colors['background'] ?? '#FEF3C7'),
            'reviewStatus' => 'UNDER_REVIEW',
            'countryCode' => 'SA',
        ];

        // Google Wallet API rejects `programLogo.sourceUri.uri` if it
        // is a `data:` URL — it must be a publicly fetchable HTTP(S)
        // image. Tenant logos are stored as base64 data URLs in
        // tenant.settings.branding.logo, so we expose them via a tiny
        // public asset route (`/api/public/tenant/{id}/logo`) and
        // reference THAT URL here. If the helper returns null (no
        // logo configured), we omit programLogo entirely — Google
        // renders a plain header instead of failing with 400.
        $publicLogoUrl = $this->publicLogoUrl();
        if ($publicLogoUrl) {
            $class['programLogo'] = [
                'sourceUri' => ['uri' => $publicLogoUrl],
                'contentDescription' => [
                    'defaultValue' => [
                        'language' => 'ar',
                        'value' => $tenant?->name ?? 'Logo',
                    ],
                ],
            ];
        }

        return $class;
    }

    /**
     * Resolve the brand logo to a publicly fetchable URL Google can
     * download. We can't pass a `data:` URL — Google rejects them.
     *
     * Strategy:
     *   - If `design.logoUrl` or `tenant.settings.branding.logo` is
     *     already an HTTP(S) URL, use it directly.
     *   - If it's a `data:` URL (the common case from our editors),
     *     we point Google at a public asset route that decodes the
     *     base64 on the fly and serves it as a real image.
     *   - If neither exists, return null and the caller omits
     *     `programLogo` from the class JSON.
     */
    private function publicLogoUrl(): ?string
    {
        $template = $this->card->template;
        $design = $template?->design ?? [];
        $tenant = $template?->tenant;

        $perCardOverride = $design['logoUrl'] ?? null;
        $brandLogo = data_get($tenant?->settings, 'branding.logo');
        $source = $perCardOverride ?: $brandLogo;

        if (! $source) {
            return null;
        }

        // Already an external HTTP(S) URL? Use it as-is.
        if (preg_match('#^https?://#i', (string) $source)) {
            return (string) $source;
        }

        // Otherwise it's a `data:` URL — expose it via the public
        // tenant logo endpoint so Google can fetch it.
        if ($tenant) {
            return rtrim((string) config('app.url'), '/').
                '/api/public/tenant/'.$tenant->id.'/logo';
        }

        return null;
    }

    /**
     * Build the loyaltyObject JSON — per-customer state. Reference:
     * https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyobject
     */
    public function buildLoyaltyObject(): array
    {
        $template = $this->card->template;
        $design = $template?->design ?? [];
        $reward = $template?->rewards?->first();
        $stampsRequired = $reward?->stamps_required ?? 10;

        $customerName = trim(
            ($this->card->customer?->first_name ?? '').' '.
            ($this->card->customer?->last_name ?? ''),
        ) ?: ($this->card->customer?->phone ?? '—');

        $object = [
            'id' => $this->objectId(),
            'classId' => $this->classId(),
            'state' => 'ACTIVE',
            'accountId' => (string) $this->card->customer_id,
            'accountName' => $customerName,
            'loyaltyPoints' => [
                'label' => $design['labels']['stamps'] ?? 'الأختام',
                'balance' => [
                    'string' => "{$this->card->stamps_count}/{$stampsRequired}",
                ],
            ],
            'barcode' => [
                'type' => 'QR_CODE',
                'value' => $this->card->serial_number,
                'alternateText' => $this->card->serial_number,
            ],
        ];

        // Geofence locations — reuse the same `card_template_location`
        // pivot that feeds Apple Wallet. Google Wallet caps locations
        // at 10 per object just like Apple.
        $branches = $template?->locations
            ?->filter(fn ($loc) => $loc->is_active && $loc->lat !== null && $loc->lng !== null)
            ?->take(10);

        if ($branches !== null && $branches->isNotEmpty()) {
            $object['locations'] = $branches->map(fn ($loc) => [
                'latitude' => (float) $loc->lat,
                'longitude' => (float) $loc->lng,
            ])->values()->all();
        }

        return $object;
    }

    /**
     * The loyaltyClass ID Google stores. MUST start with the issuer
     * ID and contain only [A-Za-z0-9._-]. We scope it to the card
     * template so one class covers every issued card from that
     * template.
     */
    private function classId(): string
    {
        $issuer = $this->api->issuerId();
        $cfg = $this->settings->get('wallet.google') ?? [];
        $prefix = $cfg['class_prefix'] ?? 'stamply';

        return "{$issuer}.{$prefix}_template_{$this->card->card_template_id}";
    }

    /** Per-issued-card object ID. Same charset rules as classId. */
    private function objectId(): string
    {
        $issuer = $this->api->issuerId();
        $cfg = $this->settings->get('wallet.google') ?? [];
        $prefix = $cfg['class_prefix'] ?? 'stamply';

        return "{$issuer}.{$prefix}_card_{$this->card->id}";
    }

    /**
     * Google's `hexBackgroundColor` wants a 6-digit hex starting
     * with `#`. Strip any alpha channel or shorthand (#fff → #ffffff).
     */
    private function normaliseHex(string $hex): string
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        if (strlen($hex) === 8) {
            // Strip alpha
            $hex = substr($hex, 0, 6);
        }

        return '#'.strtolower($hex);
    }
}
