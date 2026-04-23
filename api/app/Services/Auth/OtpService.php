<?php

namespace App\Services\Auth;

use App\Models\OtpSmsLog;
use App\Models\Tenant;
use App\Services\Messaging\SmsService;
use App\Services\PlatformSettingsService;
use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Twilio\Rest\Client as TwilioClient;

/**
 * Shared OTP engine used by every phone-verification flow in the app.
 *
 * Two flows exist today, both routed through this service:
 *
 *   - `signup`        — post-registration phone proof on /i/{serial}
 *                       (called from PublicOtpController)
 *   - `mobile_login`  — phone-only login for the native mobile app
 *                       (called from Api\App\CustomerAuthController)
 *
 * Each flow has its own cache namespace (`otp:pending:{context}:{phone}`)
 * so two parallel flows for the same phone can't overwrite each other's
 * pending codes — e.g. a user verifying their card on the web while
 * simultaneously logging into the mobile app.
 *
 * Rate limits are also scoped by context so a spammy login attempt
 * doesn't lock the user out of the signup flow and vice versa.
 */
class OtpService
{
    public const PENDING_TTL_SECONDS = 300;

    public const RESEND_COOLDOWN_SECONDS = 30;

    public const MAX_VERIFY_ATTEMPTS = 5;

    public const MAX_REQUESTS_PER_HOUR = 3;

    /** 4-digit code — quick to type on mobile; 10k combinations is fine
     *  paired with the attempt/hour limits below. */
    public const CODE_LENGTH = 4;

    /** Dev master code: any phone can be verified with this value
     *  when `APP_DEBUG=true`. Inert in production. */
    public const MASTER_DEV_CODE = '6546';

    /** Test phone numbers that skip real SMS — verified only with MASTER_DEV_CODE.
     *  Read from config so the list can be adjusted per environment without code changes. */
    private function testPhones(): array
    {
        return array_values(array_filter((array) config('auth.test_phones', [])));
    }

    public function __construct(
        private SmsService $sms,
        private PlatformSettingsService $platformSettings,
    ) {}

    /**
     * Send a fresh code. Returns a structured result so controllers can
     * translate it into whatever JSON shape they prefer.
     *
     * Rate-limiting and cooldowns are bypassed while `APP_DEBUG=true`
     * so developers can iterate on the flow without getting locked
     * out of their own test phone. Production ships with APP_DEBUG
     * off, at which point the full 3/hour + 30s cooldown are enforced.
     */
    public function sendCode(string $phone, string $context, ?Tenant $brandTenant = null): SendResult
    {
        $normalised = $this->normalisePhone($phone);
        if ($normalised === null) {
            return SendResult::invalidPhone();
        }

        // Test phone — skip real SMS, only accept master dev code.
        if (in_array($normalised, $this->testPhones(), true)) {
            Cache::put(
                $this->pendingKey($normalised, $context),
                ['test_phone' => true, 'sent_at' => time(), 'attempts' => 0],
                self::PENDING_TTL_SECONDS,
            );
            $this->logOtp($normalised, $context, 'test', 'sent');

            return SendResult::sent(
                phone: $normalised,
                phoneMasked: $this->maskPhone($normalised),
                expiresIn: self::PENDING_TTL_SECONDS,
                debugCode: null,
            );
        }

        $bypassLimits = (bool) config('app.debug');

        if (! $bypassLimits) {
            $rateKey = $this->rateKey($normalised, $context);
            if (RateLimiter::tooManyAttempts($rateKey, self::MAX_REQUESTS_PER_HOUR)) {
                return SendResult::rateLimited(RateLimiter::availableIn($rateKey));
            }

            // Short resend cooldown on top of the hourly limit.
            $pending = Cache::get($this->pendingKey($normalised, $context));
            if ($pending && ($pending['sent_at'] ?? 0) > time() - self::RESEND_COOLDOWN_SECONDS) {
                $wait = self::RESEND_COOLDOWN_SECONDS - (time() - (int) $pending['sent_at']);

                return SendResult::cooldown($wait);
            }
        }

        // MessageCentral manages OTP codes themselves — delegate entirely.
        $mcConfig = $this->platformSettings->get('otp_sms.messagecentral');
        if (! empty($mcConfig['enabled'])) {
            return $this->sendViaMessageCentral($normalised, $context, $mcConfig, $bypassLimits);
        }

        // Unifonic Verify API — also manages OTP codes themselves.
        $uniConfig = $this->platformSettings->get('otp_sms.unifonic');
        if (! empty($uniConfig['enabled'])) {
            return $this->sendViaUnifonic($normalised, $context, $uniConfig, $bypassLimits);
        }

        // SMSCountry / Twilio: we generate the code and send it ourselves.
        $code = $this->generateCode();

        Cache::put(
            $this->pendingKey($normalised, $context),
            [
                'code_hash' => Hash::make($code),
                'attempts' => 0,
                'sent_at' => time(),
            ],
            self::PENDING_TTL_SECONDS,
        );

        if (! $bypassLimits) {
            RateLimiter::hit($this->rateKey($normalised, $context), 3600);
        }

        $brand = $brandTenant?->name ?? 'Stamply';
        $body = "{$brand}: رمز التحقق {$code}. صالح لمدة 5 دقائق.";

        $delivered = $this->sendOtpSms($normalised, $body);
        $activeProvider = $this->resolveActiveProvider();

        if ($delivered) {
            $this->logOtp($normalised, $context, $activeProvider, 'sent');
        } else {
            // Never log the actual OTP code — it's returned via SendResult::debugCode
            // to the caller (only when APP_DEBUG=true) for the dev UI to display.
            Log::info('[otp] SMS not delivered', [
                'context' => $context,
                'phone' => $this->maskPhone($normalised),
                'code' => '****',
            ]);
            $this->logOtp($normalised, $context, $activeProvider, $activeProvider === 'stub' ? 'sent' : 'failed');
        }

        return SendResult::sent(
            phone: $normalised,
            phoneMasked: $this->maskPhone($normalised),
            expiresIn: self::PENDING_TTL_SECONDS,
            // Expose the code only when SMS delivery failed AND APP_DEBUG is on.
            debugCode: config('app.debug') && ! $delivered ? $code : null,
        );
    }

    /**
     * Verify a code. Returns a structured result — does NOT update any
     * database rows; the controller decides what to do with a pass/fail.
     */
    public function verifyCode(string $phone, string $code, string $context): VerifyResult
    {
        $normalised = $this->normalisePhone($phone);
        if ($normalised === null) {
            return VerifyResult::invalidPhone();
        }

        // Test phone — always accept master dev code (even in production).
        if (in_array($normalised, $this->testPhones(), true) && $code === self::MASTER_DEV_CODE) {
            Cache::forget($this->pendingKey($normalised, $context));
            $this->logOtp($normalised, $context, 'test', 'verified');

            return VerifyResult::success($normalised, devBypass: true);
        }

        // Dev master code for any phone — only when APP_DEBUG is on.
        if (config('app.debug') && $code === self::MASTER_DEV_CODE) {
            Cache::forget($this->pendingKey($normalised, $context));

            Log::warning('[otp] master dev code used to verify', [
                'context' => $context,
                'phone' => $this->maskPhone($normalised),
            ]);

            return VerifyResult::success($normalised, devBypass: true);
        }

        $pending = Cache::get($this->pendingKey($normalised, $context));
        if (! $pending) {
            return VerifyResult::noPendingCode();
        }

        // MessageCentral flow: delegate verification to their API.
        if (! empty($pending['provider']) && $pending['provider'] === 'messagecentral') {
            return $this->verifyViaMessageCentral($normalised, $code, $context, $pending);
        }

        // Unifonic flow: delegate verification to their API.
        if (! empty($pending['provider']) && $pending['provider'] === 'unifonic') {
            return $this->verifyViaUnifonic($normalised, $code, $context, $pending);
        }

        // Local flow (SMSCountry / Twilio): verify against cached hash.
        $attempts = (int) ($pending['attempts'] ?? 0);
        if ($attempts >= self::MAX_VERIFY_ATTEMPTS) {
            Cache::forget($this->pendingKey($normalised, $context));

            return VerifyResult::tooManyAttempts();
        }

        if (! Hash::check($code, $pending['code_hash'] ?? '')) {
            $pending['attempts'] = $attempts + 1;
            Cache::put(
                $this->pendingKey($normalised, $context),
                $pending,
                self::PENDING_TTL_SECONDS,
            );

            return VerifyResult::invalidCode(self::MAX_VERIFY_ATTEMPTS - $pending['attempts']);
        }

        Cache::forget($this->pendingKey($normalised, $context));
        $this->logOtp($normalised, $context, $this->resolveActiveProvider(), 'verified');

        return VerifyResult::success($normalised, devBypass: false);
    }

    public function normalisePhone(string $raw): ?string
    {
        $trimmed = trim($raw);
        $plus = str_starts_with($trimmed, '+');
        $digits = preg_replace('/\D+/', '', $trimmed);
        if (strlen($digits) < 8 || strlen($digits) > 15) {
            return null;
        }

        return ($plus ? '+' : '').$digits;
    }

    public function maskPhone(string $phone): string
    {
        $len = strlen($phone);
        if ($len <= 4) {
            return $phone;
        }

        return substr($phone, 0, 4).str_repeat('•', max(0, $len - 6)).substr($phone, -2);
    }

    private function generateCode(): string
    {
        $max = (10 ** self::CODE_LENGTH) - 1;

        return str_pad((string) random_int(0, $max), self::CODE_LENGTH, '0', STR_PAD_LEFT);
    }

    /**
     * Determine which non-MessageCentral provider is currently active.
     */
    private function resolveActiveProvider(): string
    {
        // Note: MessageCentral and Unifonic are checked earlier in sendCode
        // and never reach sendOtpSms, so they're not listed here.
        $sc = $this->platformSettings->get('otp_sms.smscountry');
        if (! empty($sc['enabled'])) {
            return 'smscountry';
        }
        $tw = $this->platformSettings->get('otp_sms.twilio');
        if (! empty($tw['enabled'])) {
            return 'twilio';
        }

        return 'stub';
    }

    /**
     * Record an OTP SMS event in the log table.
     */
    private function logOtp(string $phone, string $context, string $provider, string $status, ?string $verificationId = null, ?string $error = null): void
    {
        try {
            OtpSmsLog::create([
                'phone' => $phone,
                'phone_masked' => $this->maskPhone($phone),
                'country_code' => $this->extractCountryCode($phone),
                'context' => $context,
                'device_type' => $this->detectDeviceType(),
                'provider' => $provider,
                'status' => $status,
                'verification_id' => $verificationId,
                'error_message' => $error,
            ]);
        } catch (\Throwable $e) {
            Log::warning('[otp] Failed to write OTP log', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Extract the country dial code from an E.164 phone number.
     */
    private function extractCountryCode(string $phone): string
    {
        $digits = ltrim($phone, '+');

        // Match known prefixes (longest first to avoid ambiguity)
        $prefixes = [
            '966', '971', '965', '973', '974', '968', '967', '964', '962', '961',
            '249', '212', '216', '213', '20', '90', '92', '91', '63', '62', '60',
            '49', '44', '33', '1',
        ];

        foreach ($prefixes as $prefix) {
            if (str_starts_with($digits, $prefix)) {
                return $prefix;
            }
        }

        // Fallback: first 3 digits
        return substr($digits, 0, min(3, strlen($digits)));
    }

    /**
     * Detect device type from the current request's User-Agent.
     */
    private function detectDeviceType(): string
    {
        try {
            $ua = request()->header('User-Agent', '');
        } catch (\Throwable) {
            return 'unknown';
        }

        if (empty($ua)) {
            return 'unknown';
        }

        $uaLower = strtolower($ua);

        if (str_contains($uaLower, 'iphone') || str_contains($uaLower, 'ipad')) {
            return 'iOS';
        }
        if (str_contains($uaLower, 'android')) {
            return 'Android';
        }
        if (str_contains($uaLower, 'expo') || str_contains($uaLower, 'okhttp')) {
            return 'Mobile App';
        }
        if (str_contains($uaLower, 'mozilla') || str_contains($uaLower, 'chrome') || str_contains($uaLower, 'safari')) {
            return 'Web';
        }

        return 'unknown';
    }

    private function pendingKey(string $phone, string $context): string
    {
        return "otp:pending:{$context}:{$phone}";
    }

    private function rateKey(string $phone, string $context): string
    {
        return "otp:rate:{$context}:{$phone}";
    }

    /* ──────────────────────────────────────────────────────────── */
    /*  MessageCentral — fully delegated OTP (they generate+verify) */
    /* ──────────────────────────────────────────────────────────── */

    /**
     * Send OTP via MessageCentral API. They generate the code and SMS
     * it themselves. We store the `verificationId` in cache so we can
     * call their validate endpoint later.
     */
    private function sendViaMessageCentral(string $phone, string $context, array $config, bool $bypassLimits): SendResult
    {
        $customerId = $config['customer_id'] ?? '';
        $authToken = $config['auth_token'] ?? '';

        // MessageCentral needs countryCode and mobileNumber separately.
        [$countryCode, $mobileNumber] = $this->splitPhone($phone);

        try {
            $client = new GuzzleClient(['timeout' => 15, 'http_errors' => false]);
            $response = $client->post('https://cpaas.messagecentral.com/verification/v3/send', [
                'query' => [
                    'countryCode' => $countryCode,
                    'customerId' => $customerId,
                    'flowType' => 'SMS',
                    'mobileNumber' => $mobileNumber,
                ],
                'headers' => [
                    'authToken' => $authToken,
                ],
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if (($result['responseCode'] ?? 0) != 200) {
                $errorMsg = $result['data']['errorMessage'] ?? $result['message'] ?? 'Unknown error';
                Log::warning('[otp] MessageCentral send failed', [
                    'phone' => $this->maskPhone($phone),
                    'response' => $result,
                ]);
                $this->logOtp($phone, $context, 'messagecentral', 'failed', null, $errorMsg);

                return SendResult::sent(
                    phone: $phone,
                    phoneMasked: $this->maskPhone($phone),
                    expiresIn: self::PENDING_TTL_SECONDS,
                    debugCode: config('app.debug') ? 'MC_SEND_FAILED' : null,
                );
            }

            $verificationId = $result['data']['verificationId'] ?? null;

            // Store the verificationId in cache so verifyCode can use it.
            Cache::put(
                $this->pendingKey($phone, $context),
                [
                    'provider' => 'messagecentral',
                    'verification_id' => $verificationId,
                    'customer_id' => $customerId,
                    'country_code' => $countryCode,
                    'mobile_number' => $mobileNumber,
                    'attempts' => 0,
                    'sent_at' => time(),
                ],
                self::PENDING_TTL_SECONDS,
            );

            if (! $bypassLimits) {
                RateLimiter::hit($this->rateKey($phone, $context), 3600);
            }

            Log::info('[otp] MessageCentral sent', [
                'phone' => $this->maskPhone($phone),
                'verification_id' => $verificationId,
            ]);
            $this->logOtp($phone, $context, 'messagecentral', 'sent', (string) $verificationId);

            return SendResult::sent(
                phone: $phone,
                phoneMasked: $this->maskPhone($phone),
                expiresIn: self::PENDING_TTL_SECONDS,
                debugCode: null,
            );
        } catch (\Throwable $e) {
            Log::warning('[otp] MessageCentral send threw', [
                'phone' => $this->maskPhone($phone),
                'error' => $e->getMessage(),
            ]);
            $this->logOtp($phone, $context, 'messagecentral', 'failed', null, $e->getMessage());

            return SendResult::sent(
                phone: $phone,
                phoneMasked: $this->maskPhone($phone),
                expiresIn: self::PENDING_TTL_SECONDS,
                debugCode: config('app.debug') ? 'MC_ERROR' : null,
            );
        }
    }

    /**
     * Verify OTP via MessageCentral's validate endpoint.
     */
    private function verifyViaMessageCentral(string $phone, string $code, string $context, array $pending): VerifyResult
    {
        $attempts = (int) ($pending['attempts'] ?? 0);
        if ($attempts >= self::MAX_VERIFY_ATTEMPTS) {
            Cache::forget($this->pendingKey($phone, $context));

            return VerifyResult::tooManyAttempts();
        }

        $mcConfig = $this->platformSettings->get('otp_sms.messagecentral');
        $authToken = $mcConfig['auth_token'] ?? '';

        try {
            $client = new GuzzleClient(['timeout' => 15, 'http_errors' => false]);
            $response = $client->get('https://cpaas.messagecentral.com/verification/v3/validateOtp', [
                'query' => [
                    'countryCode' => $pending['country_code'],
                    'mobileNumber' => $pending['mobile_number'],
                    'verificationId' => $pending['verification_id'],
                    'customerId' => $pending['customer_id'],
                    'code' => $code,
                ],
                'headers' => [
                    'authToken' => $authToken,
                ],
            ]);

            $result = json_decode($response->getBody()->getContents(), true);
            $status = $result['data']['verificationStatus'] ?? '';

            if ($status === 'VERIFICATION_COMPLETED') {
                Cache::forget($this->pendingKey($phone, $context));
                Log::info('[otp] MessageCentral verified', ['phone' => $this->maskPhone($phone)]);
                $this->logOtp($phone, $context, 'messagecentral', 'verified', (string) ($pending['verification_id'] ?? ''));

                return VerifyResult::success($phone, devBypass: false);
            }

            // Code was wrong — increment attempts.
            $pending['attempts'] = $attempts + 1;
            Cache::put(
                $this->pendingKey($phone, $context),
                $pending,
                self::PENDING_TTL_SECONDS,
            );

            Log::info('[otp] MessageCentral verify failed', [
                'phone' => $this->maskPhone($phone),
                'status' => $status,
            ]);

            return VerifyResult::invalidCode(self::MAX_VERIFY_ATTEMPTS - $pending['attempts']);
        } catch (\Throwable $e) {
            // Increment attempts on error too to prevent brute force.
            $pending['attempts'] = $attempts + 1;
            Cache::put(
                $this->pendingKey($phone, $context),
                $pending,
                self::PENDING_TTL_SECONDS,
            );

            Log::warning('[otp] MessageCentral verify threw', [
                'phone' => $this->maskPhone($phone),
                'error' => $e->getMessage(),
            ]);

            return VerifyResult::invalidCode(self::MAX_VERIFY_ATTEMPTS - $pending['attempts']);
        }
    }

    /**
     * Split an E.164 phone number into [countryCode, localNumber].
     * Uses a simple heuristic: Saudi numbers start with 966 (3 digits),
     * most others are 1-3 digits. We assume the local part is the last
     * 9 digits for Saudi numbers.
     */
    private function splitPhone(string $phone): array
    {
        $digits = ltrim($phone, '+');

        // Saudi Arabia: 966XXXXXXXXX (9-digit local)
        if (str_starts_with($digits, '966') && strlen($digits) >= 12) {
            return ['966', substr($digits, 3)];
        }

        // US/Canada: 1XXXXXXXXXX (10-digit local)
        if (str_starts_with($digits, '1') && strlen($digits) === 11) {
            return ['1', substr($digits, 1)];
        }

        // Generic fallback: assume last 9 digits are local
        $localLen = min(9, strlen($digits) - 1);

        return [substr($digits, 0, strlen($digits) - $localLen), substr($digits, -$localLen)];
    }

    /* ──────────────────────────────────────────────────────────── */
    /*  Unifonic — fully delegated OTP (they generate+verify)       */
    /* ──────────────────────────────────────────────────────────── */

    private function sendViaUnifonic(string $phone, string $context, array $config, bool $bypassLimits): SendResult
    {
        $appSid = $config['app_sid'] ?? '';
        $recipient = ltrim($phone, '+');

        try {
            $client = new GuzzleClient(['timeout' => 15, 'http_errors' => false]);
            $response = $client->post('https://el.cloud.unifonic.com/rest/Verify/Send', [
                'form_params' => [
                    'AppSid' => $appSid,
                    'Recipient' => $recipient,
                    'Channel' => 'sms',
                ],
            ]);

            $result = json_decode($response->getBody()->getContents(), true);
            $success = ($result['success'] ?? false) || ($result['Status'] ?? '') === 'Sent';

            if (! $success) {
                $errorMsg = $result['ErrorMessage'] ?? $result['message'] ?? 'Unknown error';
                Log::warning('[otp] Unifonic send failed', ['phone' => $this->maskPhone($phone), 'response' => $result]);
                $this->logOtp($phone, $context, 'unifonic', 'failed', null, $errorMsg);

                return SendResult::sent(
                    phone: $phone,
                    phoneMasked: $this->maskPhone($phone),
                    expiresIn: self::PENDING_TTL_SECONDS,
                    debugCode: config('app.debug') ? 'UNI_SEND_FAILED' : null,
                );
            }

            $verificationId = $result['VerificationID'] ?? $result['data']['verificationId'] ?? null;

            Cache::put(
                $this->pendingKey($phone, $context),
                [
                    'provider' => 'unifonic',
                    'verification_id' => $verificationId,
                    'app_sid' => $appSid,
                    'recipient' => $recipient,
                    'attempts' => 0,
                    'sent_at' => time(),
                ],
                self::PENDING_TTL_SECONDS,
            );

            if (! $bypassLimits) {
                RateLimiter::hit($this->rateKey($phone, $context), 3600);
            }

            Log::info('[otp] Unifonic sent', ['phone' => $this->maskPhone($phone), 'verification_id' => $verificationId]);
            $this->logOtp($phone, $context, 'unifonic', 'sent', (string) $verificationId);

            return SendResult::sent(
                phone: $phone,
                phoneMasked: $this->maskPhone($phone),
                expiresIn: self::PENDING_TTL_SECONDS,
                debugCode: null,
            );
        } catch (\Throwable $e) {
            Log::warning('[otp] Unifonic send threw', ['phone' => $this->maskPhone($phone), 'error' => $e->getMessage()]);
            $this->logOtp($phone, $context, 'unifonic', 'failed', null, $e->getMessage());

            return SendResult::sent(
                phone: $phone,
                phoneMasked: $this->maskPhone($phone),
                expiresIn: self::PENDING_TTL_SECONDS,
                debugCode: config('app.debug') ? 'UNI_ERROR' : null,
            );
        }
    }

    private function verifyViaUnifonic(string $phone, string $code, string $context, array $pending): VerifyResult
    {
        $attempts = (int) ($pending['attempts'] ?? 0);
        if ($attempts >= self::MAX_VERIFY_ATTEMPTS) {
            Cache::forget($this->pendingKey($phone, $context));

            return VerifyResult::tooManyAttempts();
        }

        $uniConfig = $this->platformSettings->get('otp_sms.unifonic');
        $appSid = $uniConfig['app_sid'] ?? '';

        try {
            $client = new GuzzleClient(['timeout' => 15, 'http_errors' => false]);
            $response = $client->post('https://el.cloud.unifonic.com/rest/Verify/Check', [
                'form_params' => [
                    'AppSid' => $appSid,
                    'Recipient' => $pending['recipient'],
                    'PassCode' => $code,
                ],
            ]);

            $result = json_decode($response->getBody()->getContents(), true);
            $verifyCode = (int) ($result['VerificationCode'] ?? $result['data']['responseCode'] ?? 0);

            // 101 = Correct
            if ($verifyCode === 101 || ($result['success'] ?? false)) {
                Cache::forget($this->pendingKey($phone, $context));
                Log::info('[otp] Unifonic verified', ['phone' => $this->maskPhone($phone)]);
                $this->logOtp($phone, $context, 'unifonic', 'verified', (string) ($pending['verification_id'] ?? ''));

                return VerifyResult::success($phone, devBypass: false);
            }

            $pending['attempts'] = $attempts + 1;
            Cache::put($this->pendingKey($phone, $context), $pending, self::PENDING_TTL_SECONDS);

            return VerifyResult::invalidCode(self::MAX_VERIFY_ATTEMPTS - $pending['attempts']);
        } catch (\Throwable $e) {
            $pending['attempts'] = $attempts + 1;
            Cache::put($this->pendingKey($phone, $context), $pending, self::PENDING_TTL_SECONDS);
            Log::warning('[otp] Unifonic verify threw', ['phone' => $this->maskPhone($phone), 'error' => $e->getMessage()]);

            return VerifyResult::invalidCode(self::MAX_VERIFY_ATTEMPTS - $pending['attempts']);
        }
    }

    /* ──────────────────────────────────────────────────────────── */
    /*  SMSCountry / Twilio — we generate + send the code ourselves */
    /* ──────────────────────────────────────────────────────────── */

    /**
     * Send an OTP SMS using the platform-level provider configured in
     * the /op settings. Falls back to logging when no provider is
     * enabled (dev mode). Only called for non-MessageCentral providers.
     */
    private function sendOtpSms(string $to, string $body): bool
    {
        // Check SMSCountry
        $smscountry = $this->platformSettings->get('otp_sms.smscountry');
        if (! empty($smscountry['enabled'])) {
            return $this->sendViaSmsCountry($to, $body, $smscountry);
        }

        // Then Twilio
        $twilio = $this->platformSettings->get('otp_sms.twilio');
        if (! empty($twilio['enabled'])) {
            return $this->sendViaTwilio($to, $body, $twilio);
        }

        // No provider enabled — log stub
        Log::info('[otp] No OTP SMS provider enabled — stub mode');

        return false;
    }

    private function sendViaSmsCountry(string $to, string $body, array $config): bool
    {
        try {
            $authKey = (string) ($config['auth_key'] ?? '');
            $authToken = (string) ($config['auth_token'] ?? '');
            $senderId = (string) ($config['sender_id'] ?? 'Stamply');
            $number = ltrim($to, '+');

            $client = new GuzzleClient(['timeout' => 15]);
            $url = "https://restapi.smscountry.com/v0.1/Accounts/{$authKey}/SMSes/";

            $response = $client->post($url, [
                'auth' => [$authKey, $authToken],
                'json' => [
                    'Text' => $body,
                    'Number' => $number,
                    'SenderId' => $senderId,
                    'Tool' => 'API',
                ],
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300 && ($result['Success'] ?? false)) {
                Log::info('[otp] SMSCountry delivered', ['to' => $to, 'uuid' => $result['MessageUUID'] ?? null]);

                return true;
            }

            Log::warning('[otp] SMSCountry non-success', ['to' => $to, 'response' => $result]);

            return false;
        } catch (\Throwable $e) {
            Log::warning('[otp] SMSCountry send threw', ['to' => $to, 'error' => $e->getMessage()]);

            return false;
        }
    }

    private function sendViaTwilio(string $to, string $body, array $config): bool
    {
        try {
            $client = new TwilioClient(
                (string) ($config['account_sid'] ?? ''),
                (string) ($config['auth_token'] ?? ''),
            );

            $client->messages->create($to, [
                'from' => $config['from_number'] ?? '',
                'body' => $body,
            ]);

            Log::info('[otp] Twilio delivered', ['to' => $to]);

            return true;
        } catch (\Throwable $e) {
            Log::warning('[otp] Twilio send threw', ['to' => $to, 'error' => $e->getMessage()]);

            return false;
        }
    }
}
