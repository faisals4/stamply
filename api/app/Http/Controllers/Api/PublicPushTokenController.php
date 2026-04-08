<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IssuedCard;
use App\Models\PushToken;
use App\Services\Messaging\PushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public (unauthenticated) endpoint used by the customer's PWA / app to
 * register or refresh a push notification token.
 *
 * Routing: POST /api/public/issued/{serial}/push-token
 *
 * Body: { platform: 'web'|'ios'|'android', token: string, device_info?: object }
 *
 * The issued card's serial number is the only identity handle we have on
 * the public side — it transitively gives us the tenant + customer.
 *
 * Idempotent: if the same (tenant_id, token) already exists we bump
 * `last_seen_at` and update `device_info`. This avoids duplicate rows
 * when the service worker re-registers.
 */
class PublicPushTokenController extends Controller
{
    public function __construct(private readonly PushService $push) {}

    /**
     * GET /api/public/issued/{serial}/push-config
     *
     * Returns whether the tenant has push enabled and, if so, the VAPID
     * public key the customer's browser needs to subscribe. Called by the
     * PWA on load to decide whether to offer the "enable notifications"
     * button.
     */
    public function showConfig(string $serial): JsonResponse
    {
        $issued = IssuedCard::withoutGlobalScopes()
            ->where('serial_number', $serial)
            ->with('template.tenant')
            ->firstOrFail();

        $tenant = $issued->template?->tenant;
        if (! $tenant) {
            abort(404);
        }

        $config = $this->push->getConfig($tenant);

        return response()->json([
            'data' => [
                'enabled' => (bool) $config['enabled']
                    && ! empty($config['vapid_public_key']),
                'vapid_public_key' => $config['enabled']
                    ? ($config['vapid_public_key'] ?: null)
                    : null,
            ],
        ]);
    }

    public function store(Request $request, string $serial): JsonResponse
    {
        $data = $request->validate([
            'platform' => ['required', 'string', 'in:web,ios,android'],
            'token' => ['required', 'string', 'min:8', 'max:8192'],
            'device_info' => ['nullable', 'array'],
        ]);

        $issued = IssuedCard::withoutGlobalScopes()
            ->where('serial_number', $serial)
            ->with('customer:id,tenant_id')
            ->firstOrFail();

        if (! $issued->customer) {
            abort(404, 'البطاقة غير متاحة');
        }

        // Upsert by (tenant_id, token). We can't use updateOrCreate on a
        // long text field for the unique index, so do it explicitly.
        $existing = PushToken::withoutGlobalScopes()
            ->where('tenant_id', $issued->tenant_id)
            ->where('token', $data['token'])
            ->first();

        if ($existing) {
            $existing->update([
                'customer_id' => $issued->customer->id,
                'platform' => $data['platform'],
                'device_info' => $data['device_info'] ?? $existing->device_info,
                'last_seen_at' => now(),
            ]);
            $token = $existing;
        } else {
            $token = PushToken::withoutGlobalScopes()->create([
                'tenant_id' => $issued->tenant_id,
                'customer_id' => $issued->customer->id,
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
}
