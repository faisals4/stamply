<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\CustomerProfile;
use App\Models\IssuedCard;
use App\Services\Auth\OtpService;
use App\Services\Auth\SendResult;
use App\Services\Auth\VerifyResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Public phone-verification flow for customers who have already
 * registered for a loyalty card.
 *
 * Design decision — registration stays open:
 *
 *   The signup form at /c/{template} does NOT require OTP. Any
 *   visitor can register and immediately see their card. This
 *   preserves the zero-friction onboarding the merchants depend on.
 *
 *   Once the card is created, the customer lands on /i/{serial}
 *   where a "verify your phone" block appears at the bottom of the
 *   page. Tapping it sends a 4-digit SMS code, the customer types it
 *   in, and the backend marks `phone_verified_at` on every customer
 *   row with that phone — **across all tenants**. Phone ownership is
 *   a real-world fact and a customer shouldn't have to verify once
 *   per merchant.
 *
 * Implementation: all cache/rate-limit/SMS mechanics live in
 * {@see \App\Services\Auth\OtpService}; this controller just decides
 * who can call the flow (serial lookup) and what happens on a
 * successful verify (cross-tenant phone_verified_at update).
 *
 * The mobile login flow uses the same OtpService with a different
 * `context` so the two can't collide on cache keys / rate limits.
 */
class PublicOtpController extends Controller
{
    /** The cache namespace this flow lives in — kept distinct from
     *  `mobile_login` so parallel flows for the same phone don't
     *  clobber each other. */
    private const CONTEXT = 'signup';

    public function __construct(private OtpService $otp) {}

    /**
     * POST /api/public/otp/request
     * Body: { serial: string }
     *
     * The customer is already holding a card, so we look the phone
     * up from the serial instead of trusting a client-supplied
     * phone string. This also means the client can't abuse this
     * endpoint to spray SMS at arbitrary numbers.
     */
    public function request(Request $request): JsonResponse
    {
        $data = $request->validate([
            'serial' => ['required', 'string', 'max:64'],
        ]);

        $card = IssuedCard::withoutGlobalScopes()
            ->with(['customer.profile', 'template.tenant'])
            ->where('serial_number', $data['serial'])
            ->first();

        if (! $card || ! $card->customer || ! $card->customer->profile) {
            return response()->json([
                'error' => 'card_not_found',
                'message' => 'البطاقة غير موجودة',
            ], 404);
        }

        if ($card->customer->profile->isPhoneVerified()) {
            return response()->json([
                'error' => 'already_verified',
                'message' => 'الرقم موثّق بالفعل',
            ], 409);
        }

        $result = $this->otp->sendCode(
            phone: (string) $card->customer->profile->phone,
            context: self::CONTEXT,
            brandTenant: $card->template?->tenant,
        );

        return match ($result->status) {
            SendResult::STATUS_INVALID_PHONE => response()->json([
                'error' => 'invalid_phone',
                'message' => 'رقم الجوال غير صالح',
            ], 422),
            SendResult::STATUS_RATE_LIMITED => response()->json([
                'error' => 'rate_limited',
                'message' => 'تم تجاوز عدد المحاولات. حاول بعد '.$result->retryAfter.' ثانية',
                'retry_after' => $result->retryAfter,
            ], 429),
            SendResult::STATUS_COOLDOWN => response()->json([
                'error' => 'cooldown',
                'message' => 'الرجاء الانتظار '.$result->retryAfter.' ثانية قبل إعادة الإرسال',
                'retry_after' => $result->retryAfter,
            ], 429),
            default => response()->json([
                'data' => [
                    'sent' => true,
                    'expires_in' => $result->expiresIn,
                    'phone_masked' => $result->phoneMasked,
                    'debug_code' => $result->debugCode,
                ],
            ]),
        };
    }

    /**
     * POST /api/public/otp/verify
     * Body: { serial: string, code: string }
     *
     * On success, flips `phone_verified_at = now()` on every customer
     * row whose phone matches the card's customer (cross-tenant).
     */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'serial' => ['required', 'string', 'max:64'],
            'code' => ['required', 'string', 'size:'.OtpService::CODE_LENGTH],
        ]);

        $card = IssuedCard::withoutGlobalScopes()
            ->with('customer.profile')
            ->where('serial_number', $data['serial'])
            ->first();

        if (! $card || ! $card->customer || ! $card->customer->profile) {
            return response()->json([
                'error' => 'card_not_found',
                'message' => 'البطاقة غير موجودة',
            ], 404);
        }

        $result = $this->otp->verifyCode(
            phone: (string) $card->customer->profile->phone,
            code: $data['code'],
            context: self::CONTEXT,
        );

        if (! $result->isSuccess()) {
            return match ($result->status) {
                VerifyResult::STATUS_INVALID_PHONE => response()->json([
                    'error' => 'invalid_phone',
                    'message' => 'رقم الجوال غير صالح',
                ], 422),
                VerifyResult::STATUS_NO_PENDING => response()->json([
                    'error' => 'no_pending_code',
                    'message' => 'لم يتم إرسال رمز. الرجاء طلب رمز جديد',
                ], 422),
                VerifyResult::STATUS_TOO_MANY_ATTEMPTS => response()->json([
                    'error' => 'too_many_attempts',
                    'message' => 'تجاوزت عدد المحاولات. اطلب رمزاً جديداً',
                ], 429),
                VerifyResult::STATUS_INVALID_CODE => response()->json([
                    'error' => 'invalid_code',
                    'message' => 'الرمز غير صحيح',
                    'attempts_left' => $result->attemptsLeft,
                ], 422),
                default => response()->json(['error' => 'unknown'], 500),
            };
        }

        // Success. Mark the profile as verified. Since the profile
        // is a single row shared across every merchant, one UPDATE
        // is enough — no cross-tenant fan-out.
        $now = now();
        $affected = CustomerProfile::where('phone', $result->phone)
            ->update(['phone_verified_at' => $now]);

        Log::info('[public-otp] phone verified', [
            'phone' => $this->otp->maskPhone($result->phone),
            'profiles_marked' => $affected,
            'dev_bypass' => $result->devBypass,
        ]);

        return response()->json([
            'data' => array_filter([
                'verified' => true,
                'verified_at' => $now->toIso8601String(),
                'dev_bypass' => $result->devBypass ?: null,
            ], fn ($v) => $v !== null),
        ]);
    }
}
