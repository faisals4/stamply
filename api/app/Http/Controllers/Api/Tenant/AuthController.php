<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/login
     * Returns a Sanctum personal access token + the user JSON.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['البريد الإلكتروني أو كلمة المرور غير صحيحة'],
            ]);
        }

        // Scope the token with the `tenant` ability so it can never be used
        // against /op/* routes (which require the `op` ability).
        $token = $user->createToken('spa', ['tenant'])->plainTextToken;

        $tenant = $user->tenant;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'tenant_id' => $user->tenant_id,
                'tenant_name' => $tenant?->name,
                'permissions' => $user->permissions(),
                'subscription' => $tenant ? [
                    'plan' => $tenant->plan,
                    'status' => $tenant->subscriptionStatus(),
                    'days_remaining' => $tenant->daysRemaining(),
                    'expires_at' => $tenant->expiresAt()?->toIso8601String(),
                    'is_trial' => $tenant->isTrial(),
                    'plan_name_ar' => $tenant->planModel()?->name_ar ?? $tenant->plan,
                ] : null,
            ],
        ]);
    }

    /**
     * POST /api/logout (authenticated)
     * Revokes the current token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/me (authenticated)
     * Returns the current user — called on app boot to refresh the cached
     * role / permissions after the admin edits them.
     * Also includes subscription info for the sidebar badge.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenant = $user->tenant;

        $response = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'tenant_id' => $user->tenant_id,
            'tenant_name' => $tenant?->name,
            'permissions' => $user->permissions(),
            'subscription' => $tenant ? [
                'plan' => $tenant->plan,
                'status' => $tenant->subscriptionStatus(),
                'days_remaining' => $tenant->daysRemaining(),
                'expires_at' => $tenant->expiresAt()?->toIso8601String(),
                'is_trial' => $tenant->isTrial(),
                'plan_name_ar' => $tenant->planModel()?->name_ar ?? $tenant->plan,
            ] : null,
        ];

        // Include expiry details so the frontend can show an inline banner
        if ($tenant && ! $tenant->isSubscriptionActive()) {
            $isTrial = $tenant->isTrial();
            $expiresAt = $tenant->expiresAt();
            $expired = [
                'plan' => $tenant->plan,
                'expired_at' => $expiresAt?->toDateString(),
                'is_trial' => $isTrial,
            ];

            if ($isTrial) {
                $trialStartedAt = $tenant->created_at;
                $trialDaysTotal = 14;
                $expired['message'] = 'اشتراكك التجريبي (14 يوم) انتهى. تواصل مع الدعم لتجديد اشتراكك.';
                $expired['trial_started_at'] = $trialStartedAt?->toDateString();
                $expired['trial_days_total'] = $trialDaysTotal;
                $expired['trial_days_used'] = $trialStartedAt
                    ? min($trialDaysTotal, (int) $trialStartedAt->diffInDays(now()))
                    : $trialDaysTotal;
            } else {
                $planModel = $tenant->planModel();
                $planName = $planModel ? $planModel->name_ar : $tenant->plan;
                $expired['message'] = "اشتراكك في خطة {$planName} انتهى بتاريخ {$expiresAt?->toDateString()}. تواصل مع الدعم لتجديد اشتراكك.";
                $expired['subscription_starts_at'] = $tenant->subscription_starts_at?->toDateString();
            }

            $response['subscription_expired_data'] = $expired;
        }

        return response()->json($response);
    }
}
