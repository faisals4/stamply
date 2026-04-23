<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\PushToken;
use App\Models\SentNotification;
use App\Models\Tenant;
use App\Services\Notifications\BroadcastNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Platform-operator ("/op") endpoints for push notifications.
 *
 * Three responsibilities:
 *
 *   1. broadcastStats()  → target audience counts so the /op UI can
 *                          show "will reach N users" before the admin
 *                          clicks Send.
 *
 *   2. sendBroadcast()   → dispatch a one-shot message. Scope is
 *                          'platform' (all users), 'tenant' (one
 *                          tenant's customers) or 'customer' (one
 *                          specific customer across all their devices).
 *
 *   3. index()/show()    → history list + detail. Powers the
 *                          /op/notifications/history and detail pages.
 *
 * Auth: every route below is inside the 'abilities:op' Sanctum group
 * (see routes/api.php). Tenant-level "send to my customers" is a
 * separate controller (not in this file) — /op is strictly the
 * platform-operator surface.
 */
class NotificationsController extends Controller
{
    public function __construct(
        private readonly BroadcastNotifier $broadcaster,
    ) {}

    // -----------------------------------------------------------------
    // Read — history & stats
    // -----------------------------------------------------------------

    /**
     * GET /api/op/notifications/stats
     *
     * Returns audience size for each supported scope. The /op Send page
     * calls this on load so the admin sees, e.g. "Platform-wide: 12,543
     * tokens" next to the Scope selector.
     *
     * Audience is token-unique (same device counted once across all
     * (tenant_id, customer_id) duplicates it may have).
     */
    public function stats(Request $request): JsonResponse
    {
        $tenantId = $request->query('tenant_id');

        // Bypass BelongsToTenant global scope — an /op operator typically
        // has no tenant_id, which would otherwise filter every token out.
        $platformCount = PushToken::withoutGlobalScopes()
            ->whereIn('platform', ['ios', 'android', 'web'])
            ->distinct('token')
            ->count('token');

        $tenantCount = null;
        if ($tenantId) {
            $tenantCount = PushToken::withoutGlobalScopes()
                ->where('tenant_id', (int) $tenantId)
                ->whereIn('platform', ['ios', 'android', 'web'])
                ->distinct('token')
                ->count('token');
        }

        return response()->json([
            'data' => [
                'platform_tokens' => $platformCount,
                'tenant_tokens' => $tenantCount,
            ],
        ]);
    }

    /**
     * GET /api/op/notifications
     *
     * History list, newest first. Supported filters:
     *   - type       string   'broadcast' | 'tenant_broadcast' | 'event'
     *   - tenant_id  int      scope to one tenant
     *   - status     string   'completed' | 'failed' | 'sending' | …
     *   - q          string   title/body fuzzy search
     *   - date_from  ISO-8601
     *   - date_to    ISO-8601
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 25), 100);

        $query = SentNotification::query()
            ->with(['tenant:id,name', 'customer:id,customer_profile_id'])
            ->orderByDesc('sent_at');

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($tenantId = $request->query('tenant_id')) {
            $query->where('tenant_id', (int) $tenantId);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($q = $request->query('q')) {
            // Simple two-column LIKE — good enough for a single-operator
            // admin UI. Swap for Meilisearch/Typesense if the table grows
            // past a few million rows.
            $query->where(function ($w) use ($q) {
                $w->where('title', 'like', "%{$q}%")
                  ->orWhere('body', 'like', "%{$q}%");
            });
        }
        if ($from = $request->query('date_from')) {
            $query->where('sent_at', '>=', $from);
        }
        if ($to = $request->query('date_to')) {
            $query->where('sent_at', '<=', $to);
        }

        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * GET /api/op/notifications/{id}
     *
     * Detail view: the parent row + sample of recipient rows. Used by
     * the history detail drawer to show "delivered to A, failed on B"
     * without loading tens of thousands of recipient rows.
     */
    public function show(int $id): JsonResponse
    {
        $notification = SentNotification::with([
            'tenant:id,name',
            'customer:id,customer_profile_id',
            'card:id,apple_pass_serial',
            'template:id,key,name',
        ])->findOrFail($id);

        // Only return a bounded sample — full recipient list can be
        // queried separately with pagination if needed.
        $recipients = $notification->recipients()
            ->with('customer:id,customer_profile_id')
            ->orderByDesc('sent_at')
            ->limit(200)
            ->get();

        return response()->json([
            'data' => [
                'notification' => $notification,
                'recipients' => $recipients,
                'recipients_truncated' => $notification->recipients()->count() > 200,
            ],
        ]);
    }

    // -----------------------------------------------------------------
    // Write — broadcast dispatch
    // -----------------------------------------------------------------

    /**
     * POST /api/op/notifications/broadcast
     *
     * Body:
     *   scope        string   'platform' | 'tenant' | 'customer'
     *   tenant_id    int      required when scope = 'tenant'
     *   customer_id  int      required when scope = 'customer'
     *   title        string   required  Up to 255 chars
     *   body         string   required  Body text
     *   image_url    string   optional  HTTPS URL, <= ~1MB for best compat
     *   deep_link    string   optional  App route to open on tap
     *                                  (e.g. "stamply://card/ABC123")
     *
     * The send is synchronous for now. See BroadcastNotifier docblock
     * for the scaling note.
     */
    public function sendBroadcast(Request $request): JsonResponse
    {
        // Title/body limits follow iOS + Android lock-screen truncation
        // thresholds so operators can't ship a banner that's visually
        // broken on half the fleet:
        //   - title: ~60 chars stays readable on every iPhone since
        //            iOS 13 (bold first line).
        //   - body:  178 chars is the hard lock-screen cut-off on iOS;
        //            Android Adaptive Notifications truncate around
        //            240, so 178 is the common safe ceiling.
        $data = $request->validate([
            'scope' => ['required', 'string', 'in:platform,tenant,customer'],
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'title' => ['required', 'string', 'max:60'],
            'body' => ['required', 'string', 'max:178'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'deep_link' => ['nullable', 'string', 'max:2048'],
        ]);

        $adminId = $request->user()?->id;

        $notification = match ($data['scope']) {
            'platform' => $this->broadcaster->sendPlatformBroadcast(
                title: $data['title'],
                body: $data['body'],
                imageUrl: $data['image_url'] ?? null,
                deepLink: $data['deep_link'] ?? null,
                adminUserId: $adminId,
            ),
            'tenant' => $this->broadcaster->sendTenantBroadcast(
                tenant: Tenant::findOrFail($data['tenant_id']),
                title: $data['title'],
                body: $data['body'],
                imageUrl: $data['image_url'] ?? null,
                deepLink: $data['deep_link'] ?? null,
                adminUserId: $adminId,
            ),
            'customer' => $this->broadcaster->sendToCustomer(
                customer: Customer::withoutGlobalScopes()
                    ->findOrFail($data['customer_id']),
                title: $data['title'],
                body: $data['body'],
                imageUrl: $data['image_url'] ?? null,
                deepLink: $data['deep_link'] ?? null,
                adminUserId: $adminId,
            ),
        };

        return response()->json([
            'data' => [
                'id' => $notification->id,
                'target_count' => $notification->target_count,
                'sent_count' => $notification->sent_count,
                'failed_count' => $notification->failed_count,
                'status' => $notification->status,
            ],
        ]);
    }

    /**
     * POST /api/op/notifications/upload-image
     *
     * Accepts a single image file (PNG/JPG/WEBP) and stores it in the
     * public disk under `notifications/`. Returns the absolute URL the
     * composer then drops into the `image_url` field before submit.
     *
     * Why HTTPS-only URLs elsewhere in the payload? APNs / FCM refuse
     * non-HTTPS attachments, and iOS's NotificationServiceExtension
     * downloads over ATS. Using the storage disk's public URL (served
     * by Laravel with HTTPS in production) sidesteps the "operator
     * has to find a public host" problem entirely.
     *
     * Constraints:
     *   - 5 MB cap, matching the existing BannerController pattern.
     *   - `image` validator rejects SVG/HEIC/etc. — APNs is happiest
     *     with PNG and JPEG.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'], // 5 MB
        ]);

        $path = $request->file('image')->store('notifications', 'public');
        $url = Storage::disk('public')->url($path);

        // Prefer the fully-qualified URL the client can drop straight
        // into `image_url`. Falls back to path when `APP_URL` isn't
        // set (e.g. local dev) — the frontend tolerates both.
        $absolute = str_starts_with($url, 'http')
            ? $url
            : rtrim(config('app.url'), '/').'/'.ltrim($url, '/');

        return response()->json([
            'data' => [
                'url' => $absolute,
                'path' => $path,
            ],
        ]);
    }
}
