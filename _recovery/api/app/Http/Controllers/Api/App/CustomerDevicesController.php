<?php

namespace App\Http\Controllers\Api\App;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\PushToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * CustomerDevicesController
 * =========================
 *
 * Mobile-app-only endpoint for registering and deregistering a native
 * push token (FCM on both iOS and Android; the Stamply backend uses
 * Firebase Cloud Messaging for both platforms — see config/firebase.php).
 *
 * Routes (mounted under /api/app):
 *   POST   /devices   — register or refresh an FCM token on login/launch
 *   DELETE /devices   — unregister on logout
 *
 * Auth: sanctum token with the 'customer' ability. The authenticated
 * user is a {@see \App\Models\CustomerProfile} (cross-tenant).
 *
 * Storage model:
 *   - push_tokens carries customer_profile_id for mobile rows.
 *   - For convenience (some queries still filter by customer_id + tenant_id),
 *     we also set those columns to the profile's "primary" customer —
 *     the earliest-created enrolment. Event-driven notifications that
 *     need to reach this device look up tokens by customer_profile_id
 *     (see CardNotificationDispatcher::dispatchFcmForTrigger()).
 *
 * Idempotency:
 *   Re-registering with the same (profile_id, token) updates the
 *   existing row rather than inserting a duplicate. FCM rotates
 *   tokens occasionally (OS updates, app reinstall) — the mobile
 *   client is expected to call this endpoint on every cold start
 *   with the current token.
 */
class CustomerDevicesController extends Controller
{
    /**
     * POST /api/app/devices
     *
     * Body:
     *   platform     string   required  'ios' | 'android'
     *   token        string   required  FCM registration token (up to ~4KB)
     *   device_info  object   optional  free-form diagnostics (OS version,
     *                                   model, app version…)
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'platform' => ['required', 'string', 'in:ios,android'],
            'token' => ['required', 'string', 'min:8', 'max:8192'],
            'device_info' => ['nullable', 'array'],
        ]);

        $profile = $request->user();
        if (! $profile) {
            abort(401);
        }

        // Find the profile's "primary" customer row (first tenant they
        // enrolled with). push_tokens has a NOT NULL (tenant_id, customer_id)
        // requirement inherited from the PWA era — we satisfy it by
        // pointing at the oldest enrolment. Cross-tenant delivery is
        // then handled via the customer_profile_id column.
        $primary = Customer::withoutGlobalScopes()
            ->where('customer_profile_id', $profile->id)
            ->orderBy('created_at')
            ->first();

        if (! $primary) {
            // No enrolments yet — the user downloaded the app but hasn't
            // grabbed any loyalty card. We still register the token so
            // broadcasts reach them (tenant_id nullable on broadcasts).
            // Drop a minimal row with tenant_id=null via withoutGlobalScopes.
            Log::info('[devices] register before any enrolment', [
                'profile_id' => $profile->id,
                'platform' => $data['platform'],
            ]);
        }

        // Upsert: same (profile_id, token) → update. Different token →
        // new row (will happen when FCM rotates).
        $existing = PushToken::withoutGlobalScopes()
            ->where('customer_profile_id', $profile->id)
            ->where('token', $data['token'])
            ->first();

        if ($existing) {
            $existing->update([
                'platform' => $data['platform'],
                'device_info' => $data['device_info'] ?? $existing->device_info,
                'last_seen_at' => now(),
                // Keep the tenant/customer pointers fresh in case the
                // user enrolled somewhere new since last registration.
                'tenant_id' => $primary?->tenant_id ?? $existing->tenant_id,
                'customer_id' => $primary?->id ?? $existing->customer_id,
            ]);
            $token = $existing;
        } else {
            $token = PushToken::withoutGlobalScopes()->create([
                'customer_profile_id' => $profile->id,
                'tenant_id' => $primary?->tenant_id,
                'customer_id' => $primary?->id,
                'platform' => $data['platform'],
                'token' => $data['token'],
                'device_info' => $data['device_info'] ?? null,
                'last_seen_at' => now(),
            ]);
        }

        return response()->json([
            'data' => [
                'id' => $token->id,
                'platform' => $token->platform,
                'registered_at' => $token->created_at,
            ],
        ]);
    }

    /**
     * DELETE /api/app/devices
     *
     * Body:
     *   token  string  required  The token to unregister.
     *
     * Called from the mobile app on explicit logout so the device
     * stops receiving notifications meant for that customer profile.
     * We don't aggressively delete on every app close — that would
     * break long-tail re-engagement pushes.
     */
    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'min:8', 'max:8192'],
        ]);

        $profile = $request->user();
        if (! $profile) {
            abort(401);
        }

        PushToken::withoutGlobalScopes()
            ->where('customer_profile_id', $profile->id)
            ->where('token', $data['token'])
            ->delete();

        return response()->json(['data' => ['ok' => true]]);
    }
}
