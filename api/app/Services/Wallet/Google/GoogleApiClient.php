<?php

namespace App\Services\Wallet\Google;

use App\Services\PlatformSettingsService;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Lightweight Google Wallet API client.
 *
 * Handles two jobs:
 *   1. Obtain (and cache) an OAuth2 access token via Service Account
 *      JWT assertion, scoped to `wallet_object.issuer`.
 *   2. Make authenticated REST calls to the Google Wallet Objects API
 *      (https://walletobjects.googleapis.com) for inserting and
 *      updating `loyaltyClass` / `loyaltyObject` resources.
 *
 * We intentionally DO NOT depend on `google/apiclient` — that package
 * pulls ~120MB of autoloaded classes, and we only need four REST
 * endpoints. This class uses Laravel's Http facade + firebase/php-jwt
 * (~50KB total) for the same job.
 *
 * All credentials are read from `platform_settings.wallet.google`:
 *   - service_account: the full JSON object downloaded from Google
 *     Cloud Console → IAM → Service Accounts → Keys
 *   - issuer_id: the tenant's Google Wallet issuer ID (numeric,
 *     from pay.google.com/business)
 *   - class_prefix: a short slug used as part of the loyaltyClass ID
 *     so multiple Stamply environments can share one issuer
 */
class GoogleApiClient
{
    private const WALLET_API_BASE = 'https://walletobjects.googleapis.com/walletobjects/v1';

    private const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const SCOPE = 'https://www.googleapis.com/auth/wallet_object.issuer';

    public function __construct(
        private readonly PlatformSettingsService $settings,
    ) {}

    /**
     * Return the service account JSON as an associative array, or
     * throw if misconfigured. We accept both a pre-parsed array and
     * a raw JSON string in platform_settings for forward-compat.
     */
    public function serviceAccount(): array
    {
        $cfg = $this->settings->get('wallet.google') ?? [];
        $sa = $cfg['service_account'] ?? null;

        if (empty($sa)) {
            throw new RuntimeException(
                'Google Wallet: service_account JSON is missing. '.
                'Upload it from /op/settings → Google Wallet.',
            );
        }

        if (is_string($sa)) {
            $parsed = json_decode($sa, true);
            if (! is_array($parsed)) {
                throw new RuntimeException('Google Wallet: service_account is not valid JSON');
            }
            $sa = $parsed;
        }

        foreach (['client_email', 'private_key', 'private_key_id'] as $required) {
            if (empty($sa[$required])) {
                throw new RuntimeException("Google Wallet: service_account missing '{$required}'");
            }
        }

        return $sa;
    }

    /** Issuer ID from platform_settings, required for every class/object id. */
    public function issuerId(): string
    {
        $cfg = $this->settings->get('wallet.google') ?? [];
        $id = (string) ($cfg['issuer_id'] ?? '');
        if ($id === '') {
            throw new RuntimeException('Google Wallet: issuer_id is not set in /op/settings');
        }

        return $id;
    }

    /**
     * Get a fresh OAuth2 access token for Wallet API calls. The token
     * is valid for 1 hour; we cache it for 55 minutes to leave a
     * small buffer and share it across every card update / save URL
     * generation happening in the same request lifecycle.
     */
    public function accessToken(): string
    {
        $sa = $this->serviceAccount();
        $cacheKey = 'google-wallet-oauth-token:'.md5($sa['client_email']);

        $cached = Cache::get($cacheKey);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $now = time();
        $assertion = JWT::encode([
            'iss' => $sa['client_email'],
            'scope' => self::SCOPE,
            'aud' => self::OAUTH_TOKEN_URL,
            'exp' => $now + 3600,
            'iat' => $now,
        ], $sa['private_key'], 'RS256', $sa['private_key_id']);

        $response = Http::asForm()->post(self::OAUTH_TOKEN_URL, [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $assertion,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException(
                'Google Wallet: OAuth token exchange failed: '.$response->body(),
            );
        }

        $token = (string) ($response->json('access_token') ?? '');
        if ($token === '') {
            throw new RuntimeException('Google Wallet: OAuth response missing access_token');
        }

        Cache::put($cacheKey, $token, now()->addMinutes(55));

        return $token;
    }

    /**
     * Upsert a loyaltyClass. Google's API doesn't have a real upsert —
     * we try INSERT first, then PATCH on 409 (already exists). This
     * matches the pattern in Google's own sample code.
     */
    public function upsertLoyaltyClass(array $classData): void
    {
        $token = $this->accessToken();
        $classId = $classData['id'];

        // Try INSERT
        $insertResponse = Http::withToken($token)
            ->post(self::WALLET_API_BASE.'/loyaltyClass', $classData);

        if ($insertResponse->successful()) {
            return;
        }

        // 409 = already exists → PATCH
        if ($insertResponse->status() === 409) {
            $patchResponse = Http::withToken($token)
                ->put(self::WALLET_API_BASE.'/loyaltyClass/'.$classId, $classData);

            if (! $patchResponse->successful()) {
                Log::warning('[google-wallet] class PUT failed', [
                    'class_id' => $classId,
                    'status' => $patchResponse->status(),
                    'body' => $patchResponse->body(),
                ]);
                throw new RuntimeException(
                    "Google Wallet: failed to update loyaltyClass {$classId}: ".$patchResponse->body(),
                );
            }

            return;
        }

        Log::warning('[google-wallet] class INSERT failed', [
            'class_id' => $classId,
            'status' => $insertResponse->status(),
            'body' => $insertResponse->body(),
        ]);
        throw new RuntimeException(
            "Google Wallet: failed to insert loyaltyClass {$classId}: ".$insertResponse->body(),
        );
    }

    /**
     * Upsert a loyaltyObject — same dance as upsertLoyaltyClass.
     * Google calls this "insert" / "update" in their SDK.
     */
    public function upsertLoyaltyObject(array $objectData): void
    {
        $token = $this->accessToken();
        $objectId = $objectData['id'];

        $insertResponse = Http::withToken($token)
            ->post(self::WALLET_API_BASE.'/loyaltyObject', $objectData);

        if ($insertResponse->successful()) {
            return;
        }

        if ($insertResponse->status() === 409) {
            $patchResponse = Http::withToken($token)
                ->put(self::WALLET_API_BASE.'/loyaltyObject/'.$objectId, $objectData);

            if (! $patchResponse->successful()) {
                Log::warning('[google-wallet] object PUT failed', [
                    'object_id' => $objectId,
                    'status' => $patchResponse->status(),
                    'body' => $patchResponse->body(),
                ]);
                throw new RuntimeException(
                    "Google Wallet: failed to update loyaltyObject {$objectId}: ".$patchResponse->body(),
                );
            }

            return;
        }

        Log::warning('[google-wallet] object INSERT failed', [
            'object_id' => $objectId,
            'status' => $insertResponse->status(),
            'body' => $insertResponse->body(),
        ]);
        throw new RuntimeException(
            "Google Wallet: failed to insert loyaltyObject {$objectId}: ".$insertResponse->body(),
        );
    }

    /**
     * Add a message to a loyaltyObject — this is how Google Wallet
     * surfaces announcements on the lock screen. A POST to the
     * object's `/addMessage` endpoint both updates the back of the
     * pass AND triggers a notification on the customer's Android
     * device (with sound, unlike Apple Wallet).
     *
     * Google caps the message body at ~320 chars.
     */
    public function addObjectMessage(string $objectId, string $header, string $body): void
    {
        $token = $this->accessToken();

        $response = Http::withToken($token)->post(
            self::WALLET_API_BASE.'/loyaltyObject/'.$objectId.'/addMessage',
            [
                'message' => [
                    'header' => mb_substr($header, 0, 60),
                    'body' => mb_substr($body, 0, 320),
                    'messageType' => 'TEXT',
                ],
            ],
        );

        if (! $response->successful()) {
            Log::warning('[google-wallet] addMessage failed', [
                'object_id' => $objectId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException(
                "Google Wallet: failed to add message to {$objectId}: ".$response->body(),
            );
        }
    }

    /**
     * Sign a "Save to Google Wallet" JWT. The customer clicks a link
     * carrying this token; Google Wallet validates the signature and
     * adds the embedded loyaltyObject to their wallet.
     *
     * The JWT is valid indefinitely — there's no exp requirement from
     * Google's side — but each click consumes the object's ID, so the
     * object MUST already exist in Google's database before the user
     * clicks. We call `upsertLoyaltyClass` + `upsertLoyaltyObject`
     * before generating the JWT to guarantee this.
     */
    public function signSaveJwt(array $objectData): string
    {
        $sa = $this->serviceAccount();

        $payload = [
            'iss' => $sa['client_email'],
            'aud' => 'google',
            'typ' => 'savetowallet',
            'iat' => time(),
            'payload' => [
                'loyaltyObjects' => [$objectData],
            ],
        ];

        return JWT::encode($payload, $sa['private_key'], 'RS256', $sa['private_key_id']);
    }
}
