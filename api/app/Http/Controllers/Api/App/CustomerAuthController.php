<?php

namespace App\Http\Controllers\Api\App;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\Auth\OtpService;
use App\Services\Auth\SendResult;
use App\Services\Auth\VerifyResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Customer-facing auth for the native mobile app.
 *
 * Phone → OTP → Sanctum token with the `customer` ability. The token
 * can ONLY hit `/api/app/*` routes; admin/op routes reject it with a
 * clean 403 via Sanctum's built-in `abilities:*` middleware.
 *
 * Two important properties of this flow:
 *
 *   1. Phone enumeration is not possible. `request` always returns 200
 *      and a generic "sent" payload — even if no Customer row exists
 *      for that phone. We only reveal the `no_account` state AFTER a
 *      valid OTP is entered, because at that point the caller has
 *      proved they own the phone and is entitled to know.
 *
 *   2. The Customer token is tokenable_id = any ONE of the customer
 *      rows with that phone. The actual cross-tenant aggregation in
 *      CustomerCardsController always re-queries by phone with
 *      `withoutGlobalScopes()` — the token's pinned customer_id is
 *      just a Sanctum bookkeeping detail.
 */
class CustomerAuthController extends Controller
{
    /** Cache namespace distinct from the post-signup `PublicOtpController`
     *  flow so the two can run in parallel for the same phone without
     *  clobbering each other's pending code. */
    private const CONTEXT = 'mobile_login';

    public function __construct(private OtpService $otp) {}

    /**
     * POST /api/app/auth/otp/request
     * Body: { phone: "+9665XXXXXXXX" }
     */
    public function request(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
        ]);

        $result = $this->otp->sendCode($data['phone'], self::CONTEXT);

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
                    // Only populated when SMS delivery failed AND APP_DEBUG=true.
                    // In stub/local mode SmsService returns success and logs the
                    // code; the mobile app instead uses the dev master '0000'.
                    'debug_code' => $result->debugCode,
                ],
            ]),
        };
    }

    /**
     * POST /api/app/auth/otp/verify
     * Body: { phone: "+9665XXXXXXXX", code: "NNNN" }
     *
     * On success: mark phone_verified_at on every Customer row with
     * this phone, pick a canonical row as the token owner, and issue
     * a Sanctum personal access token with ability `customer`.
     */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
            'code' => ['required', 'string', 'size:'.OtpService::CODE_LENGTH],
        ]);

        $result = $this->otp->verifyCode($data['phone'], $data['code'], self::CONTEXT);

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

        // The OTP passed. Now check whether a Customer row exists for
        // this phone. If not, tell the user — they need to sign up
        // with a merchant first. This is the only place we leak
        // account-existence info, and by now the caller has proved
        // phone ownership so enumeration isn't a concern.
        $customers = Customer::withoutGlobalScopes()
            ->where('phone', $result->phone)
            ->orderBy('created_at')
            ->get();

        if ($customers->isEmpty()) {
            return response()->json([
                'error' => 'no_account',
                'message' => 'لا يوجد حساب مرتبط بهذا الرقم. سجّل في إحدى البطاقات أولاً.',
            ], 404);
        }

        // Mark every row as phone-verified (cross-tenant). Same pattern
        // as the public OTP flow.
        $now = now();
        Customer::withoutGlobalScopes()
            ->where('phone', $result->phone)
            ->update(['phone_verified_at' => $now]);

        // Pick the oldest Customer row as the canonical token owner.
        // Any row with this phone would work — they're all "the same
        // person" from the mobile app's point of view.
        $canonical = $customers->first();

        $token = $canonical->createToken('mobile', ['customer'])->plainTextToken;

        Log::info('[app-auth] customer logged in', [
            'phone' => $this->otp->maskPhone($result->phone),
            'rows_linked' => $customers->count(),
            'dev_bypass' => $result->devBypass,
        ]);

        return response()->json([
            'data' => [
                'token' => $token,
                'customer' => $this->presentCustomer($canonical),
            ],
        ]);
    }

    /**
     * POST /api/app/auth/logout
     * Revokes the current mobile token only. Other devices stay
     * logged in.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }

    private function presentCustomer(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'phone' => $customer->phone,
            'first_name' => $customer->first_name,
            'last_name' => $customer->last_name,
            'email' => $customer->email,
            'locale' => $customer->locale,
            'phone_verified_at' => $customer->phone_verified_at?->toIso8601String(),
        ];
    }
}
