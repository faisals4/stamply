<?php

namespace App\Services\Wallet\Apple;

use App\Services\PlatformSettingsService;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Sends silent "wake up and re-fetch" pushes to Apple Wallet via APNs
 * HTTP/2. Apple Wallet is unique among APNs clients in two ways:
 *
 *   1. The push payload is literally `{}` — Wallet only cares that a
 *      push arrived; the actual update happens when the device calls
 *      back to GET /v1/passes/{ptid}/{serial}.
 *   2. Authentication uses **mTLS** with the same Pass Type ID
 *      certificate that signs the .pkpass — NOT a JWT/.p8 token. The
 *      same cert+key sitting in `platform_settings.wallet.apple` does
 *      double duty.
 *
 * Headers:
 *   - apns-topic: <passTypeIdentifier>
 *   - apns-push-type: background  (required for empty payloads)
 *   - apns-priority: 5            (background)
 *   - apns-expiration: 0          (drop if undeliverable)
 */
class ApplePushNotifier
{
    private const PROD_HOST = 'api.push.apple.com';
    private const SANDBOX_HOST = 'api.sandbox.push.apple.com';

    public function __construct(
        private readonly PlatformSettingsService $settings,
    ) {}

    /**
     * Send the empty push to a single device. Returns the raw HTTP
     * status code so callers can react to 410 (token gone) and 5xx
     * (retryable). Throws only on setup failures (missing cert, no
     * curl, etc.) — network errors return 0.
     */
    public function push(string $pushToken): int
    {
        $cfg = $this->settings->get('wallet.apple');

        if (empty($cfg['pass_type_id'])) {
            throw new RuntimeException('Apple Wallet: pass_type_id is not set in /op/settings');
        }
        if (empty($cfg['cert_pem']) || empty($cfg['key_pem'])) {
            throw new RuntimeException('Apple Wallet: signing certificate or private key is missing — upload them from /op/settings');
        }

        // Development short-circuit. When the operator seeded the
        // wallet with `wallet:seed-dev` we hold a self-signed cert that
        // Apple's APNs gateway will reject during the TLS handshake. We
        // log the intended push so the developer sees the wiring work
        // end-to-end, then return 200 so the queue job exits cleanly.
        if (! empty($cfg['is_development'])) {
            Log::info('[apns] dev mode — push intent logged, not sent', [
                'token' => substr($pushToken, 0, 8).'…',
                'topic' => $cfg['pass_type_id'],
            ]);

            return 200;
        }

        $host = ! empty($cfg['use_sandbox']) ? self::SANDBOX_HOST : self::PROD_HOST;

        // libcurl wants the cert and key on disk. Write a per-call temp
        // pem (chmod 0600) and clean it up in finally. Workers that send
        // many pushes can be optimised later by caching the file.
        $certFile = $this->writeTempPem($cfg['cert_pem']);
        $keyFile = $this->writeTempPem($cfg['key_pem']);

        // Capture response headers so we can log the `apns-id` — Apple
        // echoes this UUID back on every successful push so the merchant
        // can trace individual pushes through Apple's feedback channel
        // when debugging "did this specific push arrive?" questions.
        $responseHeaders = [];

        try {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => "https://{$host}/3/device/{$pushToken}",
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => '{}',
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_2_0,
                CURLOPT_HTTPHEADER => [
                    'apns-topic: '.$cfg['pass_type_id'],
                    'apns-push-type: background',
                    'apns-priority: 5',
                    // 1 hour delivery window — long enough to survive a
                    // phone that's briefly asleep or off Wi-Fi, short
                    // enough that stale "pass updated" pings don't pile
                    // up over days. Previously we sent expiration=0
                    // (fire and forget) which silently dropped any push
                    // arriving during a connectivity blip.
                    'apns-expiration: '.(time() + 3600),
                    'content-type: application/json',
                ],
                CURLOPT_SSLCERT => $certFile,
                CURLOPT_SSLKEY => $keyFile,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_HEADER => false,
                CURLOPT_HEADERFUNCTION => function ($curl, $headerLine) use (&$responseHeaders) {
                    $parts = explode(':', $headerLine, 2);
                    if (count($parts) === 2) {
                        $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                    }

                    return strlen($headerLine);
                },
            ]);

            if (! empty($cfg['key_password'])) {
                curl_setopt($ch, CURLOPT_SSLKEYPASSWD, $cfg['key_password']);
            }

            $body = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);

            $apnsId = $responseHeaders['apns-id'] ?? null;

            if ($status === 0) {
                Log::warning('[apns] curl error', [
                    'host' => $host,
                    'token' => substr($pushToken, 0, 8).'…',
                    'error' => $err,
                ]);
            } elseif ($status >= 400) {
                Log::warning('[apns] non-2xx response', [
                    'host' => $host,
                    'token' => substr($pushToken, 0, 8).'…',
                    'status' => $status,
                    'apns_id' => $apnsId,
                    'body' => is_string($body) ? mb_substr($body, 0, 256) : null,
                ]);
            } else {
                // Success is logged now too — the merchant's support
                // staff needs to see "yes, we sent it" as clearly as
                // failures. apns-id is the only reliable trace handle
                // Apple gives us for follow-up.
                Log::info('[apns] push accepted', [
                    'host' => $host,
                    'topic' => $cfg['pass_type_id'],
                    'token' => substr($pushToken, 0, 8).'…',
                    'status' => $status,
                    'apns_id' => $apnsId,
                ]);
            }

            return $status;
        } finally {
            @unlink($certFile);
            @unlink($keyFile);
        }
    }

    private function writeTempPem(string $contents): string
    {
        $path = tempnam(sys_get_temp_dir(), 'apns_');
        if ($path === false) {
            throw new RuntimeException('Apple Wallet: unable to create temp file for APNs cert');
        }
        file_put_contents($path, $contents);
        @chmod($path, 0600);

        return $path;
    }
}
