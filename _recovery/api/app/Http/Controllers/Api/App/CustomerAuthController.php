<?php

namespace App\Http\Controllers\Api\App;

use App\Http\Controllers\Controller;
use App\Models\CustomerProfile;
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
 * # Central CustomerProfile model
 *
 * Since the profile refactor, the token is issued directly against
 * a `CustomerProfile` (not a tenant-scoped Customer row). That means
 * `$request->user()` inside `/api/app/*` returns the profile — a
 * single row identified by phone. All downstream controllers
 * (CustomerCardsController, CustomerProfileController) read personal
 * fields straight off the profile.
 *
 * Phone enumeration is still blocked: `request` always returns 200
 * regardless of whether a profile exists. The `no_account` state is
 * only revealed after a valid OTP — at that point the caller has
 * proven phone ownership and is entitled to know.
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

        // OTP passed. Look up or create the profile for this phone.
        // If the customer hasn't signed up at any merchant yet, we
        // still create a profile so they can browse stores and sign
        // up for loyalty cards from within the app.
        $profile = CustomerProfile::firstOrCreate(
            ['phone' => $result->phone],
            ['phone_verified_at' => now()],
        );

        // Stamp the profile as verified. Since the profile is the
        // single source of truth, one UPDATE does it — no fan-out
        // needed.
        $profile->update(['phone_verified_at' => now()]);

        $token = $profile->createToken('mobile', ['customer'])->plainTextToken;

        // Count how many merchants this customer has an active
        // relationship with — handy for the mobile Home screen.
        // `withoutGlobalScopes(['tenant'])` because `customers` has
        // the BelongsToTenant scope and we're authenticated as a
        // CustomerProfile (no tenant_id) in this request.
        $tenantsCount = $profile->customers()->withoutGlobalScopes(['tenant'])->count();

        Log::info('[app-auth] customer logged in', [
            'phone' => $this->otp->maskPhone($result->phone),
            'profile_id' => $profile->id,
            'tenants' => $tenantsCount,
            'dev_bypass' => $result->devBypass,
        ]);

        return response()->json([
            'data' => [
                'token' => $token,
                'customer' => $this->presentProfile($profile),
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

    private function presentProfile(CustomerProfile $profile): array
    {
        return [
            'id' => $profile->id,
            'phone' => $profile->phone,
            'first_name' => $profile->first_name,
            'last_name' => $profile->last_name,
            'email' => $profile->email,
            // Date-only string so the mobile form can show it
            // directly in a `<input type="date">` field without an
            // extra formatting step.
            'birthdate' => $profile->birthdate?->toDateString(),
            'gender' => $profile->gender,
            'phone_verified_at' => $profile->phone_verified_at?->toIso8601String(),
            'locked_fields' => $profile->locked_fields ?? [],
        ];
    }
}
