<?php

namespace App\Services\Auth;

use App\Models\Tenant;
use App\Services\Messaging\SmsService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

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
    public const MASTER_DEV_CODE = '0000';

    public function __construct(private SmsService $sms) {}

    /**
     * Send a fresh code. Returns a structured result so controllers can
     * translate it into whatever JSON shape they prefer.
     */
    public function sendCode(string $phone, string $context, ?Tenant $brandTenant = null): SendResult
    {
        $normalised = $this->normalisePhone($phone);
        if ($normalised === null) {
            return SendResult::invalidPhone();
        }

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

        RateLimiter::hit($rateKey, 3600);

        $brand = $brandTenant?->name ?? 'Stamply';
        $body = "{$brand}: رمز التحقق {$code}. صالح لمدة 5 دقائق.";

        $delivered = false;
        try {
            $delivered = $this->sms->send($normalised, $body, $brandTenant);
        } catch (\Throwable $e) {
            Log::warning('[otp] SMS send threw', [
                'context' => $context,
                'phone' => $this->maskPhone($normalised),
                'error' => $e->getMessage(),
            ]);
        }

        if (! $delivered) {
            Log::info('[otp] SMS not delivered — code logged for dev', [
                'context' => $context,
                'phone' => $this->maskPhone($normalised),
                'code' => $code,
            ]);
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

        // Dev master code: `0000` always verifies when APP_DEBUG is on.
        // Production ships with APP_DEBUG=false so this path is dead there.
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

    private function pendingKey(string $phone, string $context): string
    {
        return "otp:pending:{$context}:{$phone}";
    }

    private function rateKey(string $phone, string $context): string
    {
        return "otp:rate:{$context}:{$phone}";
    }
}
