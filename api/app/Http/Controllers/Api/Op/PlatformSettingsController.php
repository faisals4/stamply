<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Controller;
use App\Services\Messaging\PushService;
use App\Services\PlatformSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SaaS-operator-only endpoints for managing platform-level credentials
 * that are shared across every tenant. Only users authenticated with the
 * `op` ability can hit these routes.
 *
 * Pattern matches the tenant-side IntegrationsController but scoped to
 * the operator's view: what Stamply itself owns, not what the individual
 * merchants own.
 */
class PlatformSettingsController extends Controller
{
    public function __construct(
        private readonly PlatformSettingsService $settings,
        private readonly PushService $push,
    ) {}

    /**
     * GET /api/op/settings/push
     * Returns the current platform-level push config with secrets masked.
     */
    public function showPush(): JsonResponse
    {
        $vapid = $this->settings->get('push.vapid');
        $apns = $this->settings->get('push.apns');
        $fcm = $this->settings->get('push.fcm');

        return response()->json([
            'data' => [
                'vapid' => [
                    'public_key' => $vapid['vapid_public_key'] ?? '',
                    // Mask — admins need confirmation a key exists, not to
                    // see it again.
                    'private_key_masked' => isset($vapid['vapid_private_key'])
                        ? str_repeat('•', 4).substr($vapid['vapid_private_key'], -4)
                        : '',
                    'has_private_key' => ! empty($vapid['vapid_private_key']),
                    'subject' => $vapid['vapid_subject'] ?? '',
                ],
                'apns' => [
                    'team_id' => $apns['team_id'] ?? '',
                    'key_id' => $apns['key_id'] ?? '',
                    'bundle_id' => $apns['bundle_id'] ?? '',
                    'has_key' => ! empty($apns['key_body']),
                ],
                'fcm' => [
                    'project_id' => $fcm['project_id'] ?? '',
                    'has_service_account' => ! empty($fcm['service_account']),
                ],
            ],
        ]);
    }

    /**
     * POST /api/op/settings/push/vapid/generate
     * Auto-generate a VAPID keypair and store it. Safe on first run; a
     * second call is a no-op if keys already exist.
     */
    public function generateVapid(): JsonResponse
    {
        $keys = $this->push->ensurePlatformVapidKeys();

        return response()->json([
            'data' => [
                'public_key' => $keys['vapid_public_key'] ?? '',
                'has_private_key' => ! empty($keys['vapid_private_key']),
                'subject' => $keys['vapid_subject'] ?? '',
            ],
        ]);
    }

    /**
     * POST /api/op/settings/push/vapid/regenerate
     * Emergency rotation — replaces the existing keypair AND deletes every
     * existing Web Push subscription because they're signed under the old
     * public key and would fail to receive anything.
     */
    public function regenerateVapid(): JsonResponse
    {
        $keys = $this->push->regeneratePlatformVapidKeys();

        return response()->json([
            'data' => [
                'public_key' => $keys['vapid_public_key'] ?? '',
                'has_private_key' => ! empty($keys['vapid_private_key']),
                'subject' => $keys['vapid_subject'] ?? '',
                'message' => 'تم توليد مفاتيح جديدة — جميع الاشتراكات الموجودة سابقاً حُذفت',
            ],
        ]);
    }

    /**
     * PUT /api/op/settings/push/vapid
     * Manual edit — mostly for setting `vapid_subject` (mailto:...) or
     * pasting in externally-generated keys. Leave a field empty/null to
     * keep the existing value.
     */
    public function updateVapid(Request $request): JsonResponse
    {
        $data = $request->validate([
            'vapid_public_key' => ['nullable', 'string', 'max:1024'],
            'vapid_private_key' => ['nullable', 'string', 'max:1024'],
            'vapid_subject' => ['nullable', 'string', 'max:255'],
        ]);

        $patch = [];
        foreach ($data as $k => $v) {
            if ($v !== null && $v !== '') {
                $patch[$k] = $v;
            }
        }
        if (! empty($patch)) {
            $this->settings->merge('push.vapid', $patch);
        }

        return $this->showPush();
    }

    /**
     * PUT /api/op/settings/push/apns
     * Set platform APNs credentials (shared across all tenants).
     */
    public function updateApns(Request $request): JsonResponse
    {
        $data = $request->validate([
            'team_id' => ['nullable', 'string', 'max:32'],
            'key_id' => ['nullable', 'string', 'max:32'],
            'bundle_id' => ['nullable', 'string', 'max:255'],
            'key_body' => ['nullable', 'string', 'max:8192'],
        ]);

        $patch = [];
        foreach ($data as $k => $v) {
            if ($v !== null && $v !== '') {
                $patch[$k] = $v;
            }
        }
        if (! empty($patch)) {
            $this->settings->merge('push.apns', $patch);
        }

        return $this->showPush();
    }

    /**
     * PUT /api/op/settings/push/fcm
     */
    public function updateFcm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['nullable', 'string', 'max:128'],
            'service_account' => ['nullable', 'string', 'max:16384'],
        ]);

        $patch = [];
        foreach ($data as $k => $v) {
            if ($v !== null && $v !== '') {
                $patch[$k] = $v;
            }
        }
        if (! empty($patch)) {
            $this->settings->merge('push.fcm', $patch);
        }

        return $this->showPush();
    }

    /* ──────────────────────────────────────────────────────────── */
    /*  Wallet (Apple + Google) — shared across every tenant         */
    /* ──────────────────────────────────────────────────────────── */

    /**
     * GET /api/op/settings/wallet
     * Returns Apple Wallet + Google Wallet credentials (secrets masked) plus
     * a few derived diagnostics the operator UI uses to surface readiness:
     * cert metadata, days until expiry, key/cert match, and whether the
     * environment can actually deliver real-time updates (HTTPS APP_URL).
     */
    public function showWallet(): JsonResponse
    {
        $apple = $this->settings->get('wallet.apple');
        $google = $this->settings->get('wallet.google');

        // Apple cert inspection — null when no cert is uploaded yet, or
        // when openssl couldn't parse it. We deliberately don't expose
        // the raw PEM, just the bits the UI needs to render a status
        // badge ("expires in 391 days", "cert/key match: yes").
        $appleCertInfo = null;
        if (! empty($apple['cert_pem'])) {
            $parsed = @openssl_x509_parse($apple['cert_pem']);
            if (is_array($parsed)) {
                $expiresAt = (int) ($parsed['validTo_time_t'] ?? 0);
                $daysLeft = $expiresAt > 0
                    ? (int) floor(($expiresAt - time()) / 86400)
                    : null;

                // Cert ↔ key signature pair check. Both must load AND
                // their public keys must serialize to the same string —
                // openssl_pkey_get_details() is the simplest way to do
                // this without bringing in extra crypto.
                $keyMatch = false;
                if (! empty($apple['key_pem'])) {
                    $pub = @openssl_pkey_get_public($apple['cert_pem']);
                    $priv = @openssl_pkey_get_private(
                        $apple['key_pem'],
                        $apple['key_password'] ?? '',
                    );
                    if ($pub && $priv) {
                        $pubD = openssl_pkey_get_details($pub);
                        $privD = openssl_pkey_get_details($priv);
                        $keyMatch = ($pubD['key'] ?? null) === ($privD['key'] ?? null);
                    }
                }

                $issuerCn = (string) ($parsed['issuer']['CN'] ?? '');
                $subjectCn = (string) ($parsed['subject']['CN'] ?? '');

                $appleCertInfo = [
                    'subject_cn' => $subjectCn,
                    'subject_uid' => (string) ($parsed['subject']['UID'] ?? ''),
                    'subject_ou' => (string) ($parsed['subject']['OU'] ?? ''),
                    'subject_o' => (string) ($parsed['subject']['O'] ?? ''),
                    'issuer_cn' => $issuerCn,
                    'issued_at' => (int) ($parsed['validFrom_time_t'] ?? 0),
                    'expires_at' => $expiresAt,
                    'days_until_expiry' => $daysLeft,
                    'is_expired' => $expiresAt > 0 && $expiresAt < time(),
                    // Apple-issued certs have an issuer CN starting with
                    // "Apple Worldwide Developer Relations". Anything
                    // else is self-signed (our wallet:seed-dev path) or
                    // from a third-party CA — both unsuitable for prod.
                    'is_apple_issued' => str_contains($issuerCn, 'Apple Worldwide Developer Relations'),
                    'key_matches_cert' => $keyMatch,
                ];
            }
        }

        // Auto-update gating. iOS Wallet REQUIRES the webServiceURL in
        // pass.json to be HTTPS, so we only emit it when APP_URL is
        // https://. The operator needs to see this clearly because it's
        // the difference between "card downloads" and "card auto-updates".
        $appUrl = (string) config('app.url');
        $isHttps = str_starts_with(strtolower($appUrl), 'https://');

        // Number of devices currently registered to receive pass updates.
        // Useful diagnostic when debugging "why aren't my updates landing".
        $installedDevices = \DB::table('apple_pass_registrations')->count();

        return response()->json([
            'data' => [
                'apple' => [
                    'pass_type_id' => $apple['pass_type_id'] ?? '',
                    'team_id' => $apple['team_id'] ?? '',
                    'organization_name' => $apple['organization_name'] ?? '',
                    'has_cert' => ! empty($apple['cert_pem']),
                    'has_key' => ! empty($apple['key_pem']),
                    'has_key_password' => ! empty($apple['key_password']),
                    'has_wwdr_cert' => ! empty($apple['wwdr_cert_pem']),
                    'use_sandbox' => (bool) ($apple['use_sandbox'] ?? false),
                    'is_development' => (bool) ($apple['is_development'] ?? false),
                    'cert_info' => $appleCertInfo,
                    'auto_update_enabled' => $isHttps && ! empty($apple['cert_pem']),
                    'app_url' => $appUrl,
                    'app_url_is_https' => $isHttps,
                    'installed_devices_count' => $installedDevices,
                ],
                'google' => [
                    'issuer_id' => $google['issuer_id'] ?? '',
                    'class_prefix' => $google['class_prefix'] ?? '',
                    'has_service_account' => ! empty($google['service_account']),
                ],
            ],
        ]);
    }

    /**
     * PUT /api/op/settings/wallet/apple
     *
     * Stores the Apple Wallet pass signing credentials from a Pass Type ID
     * certificate exported from Apple Developer portal via Keychain.
     *
     * Every tenant's passes will be signed with these keys, which is the
     * standard SaaS wallet pattern — the "signed by" field shows Stamply
     * but the pass content (logo, colors, stamps) is per-tenant.
     *
     * Convenience: if the operator pastes a COMBINED PEM (certificate +
     * private key in one blob, as produced by `openssl pkcs12 -nodes`)
     * into either cert_pem or key_pem, we auto-split them.
     *
     * Leave secret fields empty to keep the existing values.
     */
    public function updateAppleWallet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pass_type_id' => ['nullable', 'string', 'max:255'],
            'team_id' => ['nullable', 'string', 'max:32'],
            'organization_name' => ['nullable', 'string', 'max:255'],
            'cert_pem' => ['nullable', 'string', 'max:65536'],
            'key_pem' => ['nullable', 'string', 'max:65536'],
            'key_password' => ['nullable', 'string', 'max:255'],
            'wwdr_cert_pem' => ['nullable', 'string', 'max:65536'],
            'use_sandbox' => ['nullable', 'boolean'],
        ]);

        // Auto-split: if either field contains a bundle with both blocks,
        // extract them cleanly so the operator can paste the whole .pem.
        $combined = ($data['cert_pem'] ?? '').PHP_EOL.($data['key_pem'] ?? '');
        if (trim($combined) !== '') {
            $cert = $this->extractPemBlock($combined, 'CERTIFICATE');
            $key = $this->extractPemBlock($combined, 'PRIVATE KEY');
            if ($cert !== null) {
                $data['cert_pem'] = $cert;
            }
            if ($key !== null) {
                $data['key_pem'] = $key;
            }
        }

        $patch = [];
        foreach ($data as $k => $v) {
            // Booleans must be persisted explicitly even when false —
            // operators need to be able to flip use_sandbox back off.
            if ($k === 'use_sandbox') {
                if ($v !== null) {
                    $patch[$k] = (bool) $v;
                }
                continue;
            }
            if ($v !== null && $v !== '') {
                $patch[$k] = $v;
            }
        }

        // The operator just uploaded a real Apple Wallet cert — clear
        // the development short-circuit so APNs starts hitting Apple
        // for real. Without this they'd keep wondering why pushes are
        // logged-only after their "real" credentials went in.
        if (! empty($patch['cert_pem'])) {
            $patch['is_development'] = false;
        }

        if (! empty($patch)) {
            $this->settings->merge('wallet.apple', $patch);
        }

        return $this->showWallet();
    }

    /**
     * Extract a single PEM block of a given type from a string that may
     * contain multiple blocks. Handles all three private-key variants
     * (`PRIVATE KEY`, `RSA PRIVATE KEY`, `EC PRIVATE KEY`) when asked for
     * `PRIVATE KEY`.
     */
    private function extractPemBlock(string $input, string $type): ?string
    {
        if ($type === 'PRIVATE KEY') {
            $pattern = '/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----.*?-----END (?:RSA |EC )?PRIVATE KEY-----/s';
        } else {
            $escaped = preg_quote($type, '/');
            $pattern = '/-----BEGIN '.$escaped.'-----.*?-----END '.$escaped.'-----/s';
        }

        return preg_match($pattern, $input, $m) ? $m[0] : null;
    }

    /**
     * PUT /api/op/settings/wallet/google
     *
     * Google Wallet credentials. Unlike Apple's pass-signing certificate,
     * Google uses JWT save-to-wallet links signed with a service account —
     * much simpler, no certificate chain.
     */
    public function updateGoogleWallet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'issuer_id' => ['nullable', 'string', 'max:64'],
            'class_prefix' => ['nullable', 'string', 'max:128'],
            'service_account' => ['nullable', 'string', 'max:16384'],
        ]);

        $patch = [];
        foreach ($data as $k => $v) {
            if ($v !== null && $v !== '') {
                $patch[$k] = $v;
            }
        }
        if (! empty($patch)) {
            $this->settings->merge('wallet.google', $patch);
        }

        return $this->showWallet();
    }

    /**
     * GET /api/op/settings/features
     *
     * Read the platform-wide feature flags. These are simple on/off
     * switches owned by the SaaS operator that change behaviour
     * across every tenant. Example: the phone-verification block on
     * /i/{serial} — merchants can't control this per-tenant because
     * the SMS infrastructure is shared and billed at the platform
     * level.
     *
     * Current flags:
     *   - phone_verification: show the post-signup OTP prompt on the
     *     public card page. Default ON.
     */
    public function showFeatures(): JsonResponse
    {
        $features = $this->settings->get('features');

        return response()->json([
            'data' => [
                'phone_verification' => (bool) ($features['phone_verification'] ?? true),
            ],
        ]);
    }

    /**
     * PUT /api/op/settings/features
     *
     * Partial update — only the keys supplied in the payload are
     * written. Missing keys are left untouched so a client that
     * doesn't know about newer flags can still flip the ones it
     * understands without wiping anything.
     */
    public function updateFeatures(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone_verification' => ['nullable', 'boolean'],
        ]);

        $patch = [];
        foreach ($data as $key => $value) {
            if ($value !== null) {
                $patch[$key] = (bool) $value;
            }
        }

        if (! empty($patch)) {
            $this->settings->merge('features', $patch);
        }

        return $this->showFeatures();
    }
}
