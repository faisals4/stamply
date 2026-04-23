<?php

namespace App\Services\Notifications;

use App\Models\Customer;
use App\Models\PushToken;
use App\Models\SentNotification;
use App\Models\SentNotificationRecipient;
use App\Models\Tenant;
use App\Services\Messaging\PushService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * BroadcastNotifier — operator-initiated fan-out notifications.
 *
 * Two flavours:
 *   - sendPlatformBroadcast()  — reach every push token in the system
 *                                (only super-admins in /op can invoke).
 *   - sendTenantBroadcast()    — reach every token belonging to a given
 *                                tenant's customers (tenant owners or
 *                                super-admins).
 *
 * Both flavours:
 *   1. Create a parent {@see SentNotification} row with target_count.
 *   2. Iterate the relevant PushTokens in batches and call
 *      {@see PushService::dispatch()} per token.
 *   3. Write a {@see SentNotificationRecipient} row per token with
 *      status & error_message.
 *   4. Roll up success / failure counters on the parent row.
 *
 * Kept synchronous for now — the 500-token batch size in
 * config('firebase.multicast_batch_size') plus the fact that FCM HTTP v1
 * responds in ~100ms per call is fast enough for audiences up to a few
 * thousand. If Stamply grows past ~10k broadcast targets, wrap each
 * batch in a queued job and update counters atomically (DB::increment).
 *
 * This class does NOT know about message copy authoring — callers pass
 * already-resolved title/body. Localisation per-customer is not applied
 * at broadcast time (platform broadcasts are written once, in one
 * language, and iOS/Android render them as-is).
 */
class BroadcastNotifier
{
    public function __construct(
        private readonly PushService $push,
    ) {}

    /**
     * Send to every PushToken in the platform.
     *
     * @param  array<string,scalar|null> $data  Extra payload (deep link, etc.)
     *
     * @return SentNotification The parent audit row, with counters set.
     */
    public function sendPlatformBroadcast(
        string $title,
        string $body,
        ?string $imageUrl = null,
        ?string $deepLink = null,
        array $data = [],
        ?int $adminUserId = null,
    ): SentNotification {
        // Platform-wide broadcast must cross every tenant, so bypass the
        // BelongsToTenant global scope — otherwise an /op operator whose
        // own tenant_id is null would get zero recipients.
        $query = PushToken::withoutGlobalScopes()
            ->whereIn('platform', ['ios', 'android', 'web']);

        $notification = $this->createSentRow(
            type: SentNotification::TYPE_BROADCAST,
            source: $adminUserId ? "user:{$adminUserId}" : 'op_admin',
            tenantId: null,
            customerId: null,
            title: $title,
            body: $body,
            imageUrl: $imageUrl,
            deepLink: $deepLink,
            data: $data,
            targetCount: (clone $query)->count(),
        );

        $this->fanOut($notification, $query, $deepLink, $data, $imageUrl);

        return $notification->fresh();
    }

    /**
     * Send to every PushToken whose customer belongs to a given tenant.
     */
    public function sendTenantBroadcast(
        Tenant $tenant,
        string $title,
        string $body,
        ?string $imageUrl = null,
        ?string $deepLink = null,
        array $data = [],
        ?int $adminUserId = null,
    ): SentNotification {
        $query = PushToken::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('platform', ['ios', 'android', 'web']);

        $notification = $this->createSentRow(
            type: SentNotification::TYPE_TENANT_BROADCAST,
            source: $adminUserId ? "user:{$adminUserId}" : 'tenant_admin',
            tenantId: $tenant->id,
            customerId: null,
            title: $title,
            body: $body,
            imageUrl: $imageUrl,
            deepLink: $deepLink,
            data: $data,
            targetCount: (clone $query)->count(),
        );

        $this->fanOut($notification, $query, $deepLink, $data, $imageUrl);

        return $notification->fresh();
    }

    /**
     * Send to one specific customer across all their devices.
     *
     * Useful for direct support messages or targeted offers. Does not
     * require tenant scoping — the /op caller decides the authorisation.
     */
    public function sendToCustomer(
        Customer $customer,
        string $title,
        string $body,
        ?string $imageUrl = null,
        ?string $deepLink = null,
        array $data = [],
        ?int $adminUserId = null,
    ): SentNotification {
        $query = PushToken::withoutGlobalScopes()
            ->where('customer_id', $customer->id);

        $notification = $this->createSentRow(
            type: SentNotification::TYPE_TENANT_BROADCAST,
            source: $adminUserId ? "user:{$adminUserId}" : 'op_admin',
            tenantId: $customer->tenant_id,
            customerId: $customer->id,
            title: $title,
            body: $body,
            imageUrl: $imageUrl,
            deepLink: $deepLink,
            data: $data,
            targetCount: (clone $query)->count(),
        );

        $this->fanOut($notification, $query, $deepLink, $data, $imageUrl);

        return $notification->fresh();
    }

    // -----------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------

    /**
     * Insert the parent audit row with everything we know up-front.
     * Counters start at 0 and are incremented as the fan-out progresses.
     */
    private function createSentRow(
        string $type,
        string $source,
        ?int $tenantId,
        ?int $customerId,
        string $title,
        string $body,
        ?string $imageUrl,
        ?string $deepLink,
        array $data,
        int $targetCount,
    ): SentNotification {
        // Merge the deep link into the `data` column for easy inspection
        // in /op. The transport layer still reads `deepLink` separately
        // so the FCM payload stays clean.
        $storedData = $data;
        if ($deepLink !== null) {
            $storedData['url'] = $deepLink;
        }

        return SentNotification::create([
            'type' => $type,
            'source' => $source,
            'tenant_id' => $tenantId,
            'customer_id' => $customerId,
            'title' => $title,
            'body' => $body,
            'image_url' => $imageUrl,
            'data' => $storedData,
            'target_count' => $targetCount,
            'status' => SentNotification::STATUS_SENDING,
            'sent_at' => now(),
        ]);
    }

    /**
     * Iterate the token query in chunks, attempt delivery per token,
     * and write the audit rows. Chunk size comes from config to match
     * FCM's multicast payload limit (500) so future batch-send upgrades
     * can swap in chunk-wise multicast without changing callers.
     */
    private function fanOut(
        SentNotification $notification,
        $tokenQuery,
        ?string $deepLink,
        array $data,
        ?string $imageUrl,
    ): void {
        $sent = 0;
        $failed = 0;
        $chunkSize = (int) config('firebase.multicast_batch_size', 500);

        // Eager-load tenant so PushService::dispatch() can read the
        // per-tenant config without triggering LazyLoadingViolation
        // under Model::preventLazyLoading().
        $tokenQuery->with('tenant')->chunkById($chunkSize, function ($tokens) use (
            $notification,
            $deepLink,
            $data,
            $imageUrl,
            &$sent,
            &$failed,
        ) {
            foreach ($tokens as $token) {
                $ok = $this->push->dispatch(
                    token: $token,
                    title: $notification->title,
                    body: $notification->body,
                    url: $deepLink,
                    data: array_merge($data, [
                        'notification_id' => $notification->id,
                    ]),
                    imageUrl: $imageUrl,
                );

                // If dispatch() found the token expired/invalid it may
                // have deleted the row (FCM NotFound, Web Push 410).
                // Skip the FK insert in that case — nothing to audit
                // against a row that no longer exists.
                if ($token->exists) {
                    SentNotificationRecipient::create([
                        'sent_notification_id' => $notification->id,
                        'customer_id' => $token->customer_id,
                        'push_token_id' => $token->id,
                        'platform' => $token->platform,
                        'status' => $ok
                            ? SentNotificationRecipient::STATUS_SENT
                            : SentNotificationRecipient::STATUS_FAILED,
                        'sent_at' => now(),
                    ]);
                }

                $ok ? $sent++ : $failed++;
            }
        });

        $notification->update([
            'sent_count' => $sent,
            'failed_count' => $failed,
            'status' => SentNotification::STATUS_COMPLETED,
        ]);

        Log::info('[broadcast] completed', [
            'notification_id' => $notification->id,
            'target' => $notification->target_count,
            'sent' => $sent,
            'failed' => $failed,
        ]);
    }
}
