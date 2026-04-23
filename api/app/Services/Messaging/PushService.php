<?php

namespace App\Services\Messaging;

use App\Models\PushToken;
use App\Models\Tenant;
use App\Services\Messaging\Firebase\FcmTransport;
use App\Services\PlatformSettingsService;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\VAPID;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Push notification dispatcher — Web Push / APNs / FCM.
 *
 * Credentials resolution order:
 *   1. Tenant override (tenant.settings.integrations.push) — enterprise
 *      tenants who want to bring their own keys
 *   2. Platform defaults (platform_settings.push.vapid) — Stamply's own
 *      keys managed from /op settings, used by every tenant by default
 *   3. Empty — push disabled
 *
 * This lets brand-new tenants send notifications the moment they sign up,
 * while preserving BYOK for rare enterprise cases.
 */
class PushService
{
    public function __construct(
        private readonly PlatformSettingsService $platformSettings = new PlatformSettingsService(),
        private readonly ?FcmTransport $fcm = null,
    ) {}

    /**
     * Lazily resolve the FCM transport from the container. Doing it lazily
     * (rather than requiring the DI injection in the constructor) keeps
     * `new PushService()` calls working in legacy code paths that still
     * instantiate the service without the container.
     */
    private function fcmTransport(): FcmTransport
    {
        return $this->fcm ?? app(FcmTransport::class);
    }

    /**
     * Merged credentials for Web Push / APNs / FCM — tenant override on
     * top of platform defaults.
     */
    public function getConfig(?Tenant $tenant = null): array
    {
        $tenant ??= $this->resolveTenant();

        // 1. Platform-level defaults (owned by Stamply, shared across tenants)
        $platformVapid = $this->platformSettings->get('push.vapid');
        $platformApns = $this->platformSettings->get('push.apns');
        $platformFcm = $this->platformSettings->get('push.fcm');

        // 2. Per-tenant override (enterprise BYOK)
        $tenantPush = data_get($tenant?->settings, 'integrations.push', []);

        // Resolve each field: tenant override wins, else platform, else empty.
        // An empty string on the tenant side doesn't override — only a
        // non-empty value does, so a tenant can clear its override by
        // saving an empty string.
        $pick = fn (string $key, array $platform) =>
            (isset($tenantPush[$key]) && $tenantPush[$key] !== '')
                ? $tenantPush[$key]
                : ($platform[$key] ?? '');

        $vapidPublic = $pick('vapid_public_key', $platformVapid);
        $vapidPrivate = $pick('vapid_private_key', $platformVapid);

        return [
            // Enabled if either (a) the tenant explicitly disabled it, (b)
            // the platform actually has VAPID keys. Tenants don't need to
            // opt-in anymore — it's automatic on signup.
            'enabled' => array_key_exists('enabled', $tenantPush)
                ? (bool) $tenantPush['enabled']
                : ! empty($vapidPublic) && ! empty($vapidPrivate),
            'vapid_public_key' => $vapidPublic,
            'vapid_private_key' => $vapidPrivate,
            'vapid_subject' => $pick('vapid_subject', $platformVapid) ?: 'mailto:support@stamply.cards',
            'apns_team_id' => $pick('apns_team_id', $platformApns),
            'apns_key_id' => $pick('apns_key_id', $platformApns),
            'apns_bundle_id' => $pick('apns_bundle_id', $platformApns),
            'has_apns_key' => ! empty($tenantPush['apns_key']) || ! empty($platformApns['key_body']),
            'fcm_project_id' => $pick('fcm_project_id', $platformFcm),
            'has_fcm_credentials' => ! empty($tenantPush['fcm_service_account']) || ! empty($platformFcm['service_account']),
            // Origin tracking so the UI can show "using platform defaults"
            'source' => [
                'vapid' => (isset($tenantPush['vapid_public_key']) && $tenantPush['vapid_public_key'] !== '')
                    ? 'tenant'
                    : (! empty($platformVapid['vapid_public_key']) ? 'platform' : 'none'),
            ],
        ];
    }

    /**
     * Masked version safe to send to the admin UI.
     */
    public function getConfigMasked(?Tenant $tenant = null): array
    {
        $c = $this->getConfig($tenant);
        // Public VAPID key is literally meant to be exposed (browsers need it).
        // Private key is secret — mask it.
        $priv = $c['vapid_private_key'] ?? '';
        $c['vapid_private_key'] = $priv
            ? str_repeat('•', 4).substr($priv, -4)
            : '';
        $c['has_vapid_private_key'] = (bool) $priv;

        return $c;
    }

    public function updateConfig(array $patch, ?Tenant $tenant = null): void
    {
        $tenant ??= $this->resolveTenant();
        if (! $tenant) {
            return;
        }

        $current = data_get($tenant->settings, 'integrations.push', []);
        foreach ($patch as $key => $value) {
            if ($value !== null && $value !== '') {
                $current[$key] = $value;
            }
        }
        $settings = $tenant->settings ?? [];
        $settings['integrations']['push'] = $current;
        $tenant->settings = $settings;
        $tenant->save();
    }

    /**
     * Lazily generate a VAPID keypair AT THE PLATFORM LEVEL. Called when
     * the operator visits /op/settings for the first time, or when the
     * `platform:ensure-vapid` artisan command runs on first deploy.
     *
     * Tenants no longer need their own VAPID keys — they inherit these.
     * The only reason a tenant would override is a custom brand identity
     * on enterprise tier, which is rare.
     *
     * Uses `minishlink/web-push` which produces base64-URL keys ready to
     * feed straight into the browser's PushManager.
     */
    public function ensurePlatformVapidKeys(): array
    {
        $current = $this->platformSettings->get('push.vapid');
        if (! empty($current['vapid_public_key']) && ! empty($current['vapid_private_key'])) {
            return $current;
        }

        $keys = VAPID::createVapidKeys();
        $next = [
            'vapid_public_key' => $keys['publicKey'],
            'vapid_private_key' => $keys['privateKey'],
            'vapid_subject' => $current['vapid_subject'] ?? 'mailto:support@stamply.cards',
        ];
        $this->platformSettings->set('push.vapid', $next);

        return $next;
    }

    /**
     * Regenerate platform VAPID keys — blows away every existing
     * subscription (they were signed under the old public key). Only the
     * operator should call this, and ONLY in an emergency (e.g. private
     * key leaked).
     */
    public function regeneratePlatformVapidKeys(): array
    {
        $keys = VAPID::createVapidKeys();
        $current = $this->platformSettings->get('push.vapid');
        $next = [
            'vapid_public_key' => $keys['publicKey'],
            'vapid_private_key' => $keys['privateKey'],
            'vapid_subject' => $current['vapid_subject'] ?? 'mailto:support@stamply.cards',
        ];
        $this->platformSettings->set('push.vapid', $next);

        // Delete all subscriptions — they're invalid under the new key.
        PushToken::withoutGlobalScopes()->where('platform', 'web')->delete();

        return $next;
    }

    /**
     * Dispatch a notification to a single token. Returns true on success,
     * false on failure. Routes to the right transport per platform:
     *   - web:            minishlink/web-push via VAPID
     *   - ios / android:  Firebase Cloud Messaging (FCM HTTP v1)
     *
     * Extra payload (card serial, deep link, etc.) can be passed in
     * `$data`; it surfaces to the mobile app via RemoteMessage.data
     * and to the browser via the worker's `push` event payload.
     *
     * @param  array<string,scalar|null> $data  Extra key/value pairs.
     *                                          Values are coerced to
     *                                          string before the FCM
     *                                          send (FCM requirement).
     */
    public function dispatch(
        PushToken $token,
        string $title,
        string $body,
        ?string $url = null,
        array $data = [],
        ?string $imageUrl = null,
    ): bool {
        $config = $this->getConfig($token->tenant);
        if (! $config['enabled']) {
            // Disabled — log and return false so the caller records it as
            // a failed row. Mirrors the SMS/email behaviour when provider
            // creds aren't set.
            Log::info('[push] disabled — would have sent', [
                'tenant_id' => $token->tenant_id,
                'customer_id' => $token->customer_id,
                'platform' => $token->platform,
                'title' => $title,
            ]);

            return false;
        }

        try {
            if ($token->platform === 'web') {
                return $this->dispatchWebPush($token, $config, $title, $body, $url, $imageUrl);
            }

            if ($token->platform === 'ios' || $token->platform === 'android') {
                // Inject the URL into the data payload so the mobile app
                // can deep-link on tap. Keep the `url` key name identical
                // to the Web Push payload for consistency across platforms.
                $mergedData = $data;
                if ($url !== null) {
                    $mergedData['url'] = $url;
                }

                return $this->fcmTransport()->send(
                    $token,
                    $title,
                    $body,
                    $mergedData,
                    $imageUrl,
                );
            }

            Log::warning('[push] unknown platform', [
                'token_id' => $token->id,
                'platform' => $token->platform,
            ]);

            return false;
        } catch (Throwable $e) {
            Log::error('[push] dispatch failed', [
                'tenant_id' => $token->tenant_id,
                'platform' => $token->platform,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Deliver a single notification to a Web Push endpoint using the
     * tenant's VAPID keys. Token format: the stored `token` column is the
     * browser's subscription endpoint URL; `device_info` holds the p256dh
     * and auth keys (base64-URL) that the browser returned at subscribe
     * time. If the server replies 404/410 the subscription is expired and
     * we delete the row.
     */
    private function dispatchWebPush(
        PushToken $token,
        array $config,
        string $title,
        string $body,
        ?string $url,
        ?string $imageUrl = null,
    ): bool {
        $public = $config['vapid_public_key'] ?? '';
        $private = $config['vapid_private_key'] ?? '';
        $subject = $config['vapid_subject'] ?: 'mailto:support@stamply.cards';
        if (! $public || ! $private) {
            Log::warning('[push] web transport skipped — VAPID keys missing', [
                'tenant_id' => $token->tenant_id,
            ]);

            return false;
        }

        $deviceInfo = $token->device_info ?? [];
        $keys = $deviceInfo['keys'] ?? [];
        if (empty($keys['p256dh']) || empty($keys['auth'])) {
            Log::warning('[push] web transport skipped — subscription keys missing', [
                'tenant_id' => $token->tenant_id,
                'token_id' => $token->id,
            ]);

            return false;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $public,
                'privateKey' => $private,
            ],
        ]);

        $subscription = Subscription::create([
            'endpoint' => $token->token,
            'publicKey' => $keys['p256dh'],
            'authToken' => $keys['auth'],
        ]);

        // Default click target: the tenant's public brand page `/c/{subdomain}`
        // on the FRONTEND app (not the API). Callers can override by passing
        // any absolute URL. Resolved against `config('app.frontend_url')`
        // because the SPA lives on a different host from the API in prod.
        $resolvedUrl = $url ?: null;
        if (! $resolvedUrl && $token->tenant?->subdomain) {
            $resolvedUrl = rtrim(config('app.frontend_url'), '/').'/c/'.$token->tenant->subdomain;
        }

        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'url' => $resolvedUrl,
            // Browsers read `image` for a large hero image (Notification.image)
            // and `icon` as the small square that sits next to the title.
            // Send the same URL for both — every modern browser (Chrome,
            // Edge, Firefox on desktop, mobile Chrome) picks the one it
            // needs and ignores the other. Safari ignores `image` entirely,
            // so `icon` is the only thing it renders.
            'image' => $imageUrl,
            'icon' => $imageUrl,
            'tenant_id' => $token->tenant_id,
        ]);

        $report = $webPush->sendOneNotification($subscription, $payload);

        if ($report->isSuccess()) {
            $token->update(['last_seen_at' => now()]);

            return true;
        }

        // If the subscription has expired, clean it up so future broadcasts
        // don't keep hitting a dead endpoint.
        if ($report->isSubscriptionExpired()) {
            Log::info('[push] subscription expired — deleting', [
                'tenant_id' => $token->tenant_id,
                'token_id' => $token->id,
            ]);
            $token->delete();
        } else {
            Log::warning('[push] web push failed', [
                'tenant_id' => $token->tenant_id,
                'token_id' => $token->id,
                'reason' => $report->getReason(),
            ]);
        }

        return false;
    }

    /**
     * Convenience: dispatch to every token belonging to a customer.
     * Returns the number of successful deliveries.
     */
    public function dispatchToCustomer(
        int $customerId,
        string $title,
        string $body,
        ?string $url = null,
    ): int {
        $tokens = PushToken::where('customer_id', $customerId)->get();
        $ok = 0;
        foreach ($tokens as $t) {
            if ($this->dispatch($t, $title, $body, $url)) {
                $ok++;
            }
        }

        return $ok;
    }

    private function resolveTenant(): ?Tenant
    {
        $user = auth()->user();
        if (! $user) {
            return null;
        }

        return Tenant::find($user->tenant_id);
    }
}
