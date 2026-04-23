<?php

namespace App\Services\Messaging\Firebase;

use App\Models\PushToken;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Exception\Messaging\NotFound;
use Kreait\Firebase\Messaging\ApnsConfig;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FcmNotification;
use Throwable;

/**
 * FcmTransport
 * ============
 *
 * Single responsibility: take a {@see PushToken} that targets an iOS or
 * Android device and deliver a notification to it via Firebase Cloud
 * Messaging (FCM HTTP v1).
 *
 * What this class does NOT do:
 *   - It does NOT decide whether to send (that's {@see \App\Services\Messaging\PushService}).
 *   - It does NOT build the message copy (callers pass title/body already
 *     localised and templated).
 *   - It does NOT write to sent_notifications / sent_notification_recipients
 *     — callers do that after receiving the boolean result.
 *
 * FCM "token not registered" handling:
 *   FCM tokens expire silently (app uninstalled, reinstalled, iOS backup
 *   restore, etc.). When FCM reports {@see NotFound}, we delete the row
 *   so future broadcasts don't keep hitting a dead device. This mirrors
 *   {@see PushService::dispatchWebPush()} which does the same for Web Push
 *   410 Gone responses.
 *
 * Image attachments:
 *   iOS requires `mutable-content: 1` on the APNs payload for a
 *   Notification Service Extension to download and attach an image at
 *   runtime. We set it unconditionally when `imageUrl` is provided.
 *   Android handles images natively through the `notification.image`
 *   field with no extension needed.
 */
class FcmTransport
{
    public function __construct(
        private readonly FirebaseClient $firebase,
    ) {}

    /**
     * Send a single FCM message.
     *
     * @param  PushToken       $token     iOS or Android token row
     * @param  string          $title     Short, localised title
     * @param  string          $body      Localised body text
     * @param  array<string,string> $data Extra payload the mobile app reads
     *                                    (all values MUST be strings — FCM
     *                                    requirement for the `data` field).
     *                                    Commonly includes: deep_link, card_serial,
     *                                    notification_id for tap handling.
     * @param  string|null     $imageUrl  HTTPS URL to an image (<= 1MB ideal)
     *
     * @return bool true on successful delivery, false on any failure
     *              (tokens that come back as NotFound are deleted).
     */
    public function send(
        PushToken $token,
        string $title,
        string $body,
        array $data = [],
        ?string $imageUrl = null,
    ): bool {
        if (! $this->firebase->isEnabled()) {
            Log::info('[fcm] disabled — skipping send', [
                'token_id' => $token->id,
                'platform' => $token->platform,
            ]);

            return false;
        }

        try {
            $message = $this->buildMessage($token, $title, $body, $data, $imageUrl);
            $this->firebase->messaging()->send($message);

            // Bump last_seen so "stale token cleanup" jobs know this
            // device is still reachable — same pattern as Web Push.
            $token->update(['last_seen_at' => now()]);

            return true;
        } catch (NotFound $e) {
            // FCM's polite way of saying "this token no longer exists".
            // Happens when: app uninstalled, token refreshed, backup restore.
            // Silently delete so broadcasts don't keep retrying it.
            Log::info('[fcm] token not found — deleting', [
                'token_id' => $token->id,
                'platform' => $token->platform,
            ]);
            $token->delete();

            return false;
        } catch (Throwable $e) {
            Log::warning('[fcm] send failed', [
                'token_id' => $token->id,
                'platform' => $token->platform,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Construct the {@see CloudMessage} with per-platform tweaks.
     *
     * Why the platform-specific config blocks:
     *   - Android notification channel & colour go in `android.notification`.
     *   - iOS badge, sound, mutable-content (for images), and category
     *     (for Notification Actions) go in `apns.payload.aps`.
     *   - `data` is sent to BOTH platforms and surfaces to the app via
     *     RemoteMessage.data in @react-native-firebase/messaging.
     *
     * Everything here is intentionally conservative — richer features
     * (action buttons, silent pushes, priority tuning) can be layered on
     * without changing the public API of this class.
     */
    private function buildMessage(
        PushToken $token,
        string $title,
        string $body,
        array $data,
        ?string $imageUrl,
    ): CloudMessage {
        // Normalise data values to strings — FCM rejects non-string values
        // inside the `data` object, so we coerce once, here, instead of
        // trusting every caller to do it.
        $stringData = array_map(static fn ($v) => (string) $v, $data);

        $notification = FcmNotification::create($title, $body, $imageUrl);

        $message = CloudMessage::withTarget('token', $token->token)
            ->withNotification($notification)
            ->withData($stringData);

        // iOS-specific config: image support via Service Extension,
        // default sound, and badge left untouched (apps that manage
        // their own badge count can override per-message later).
        if ($token->platform === 'ios') {
            // kreait/firebase-php 7.x exposes APS fields individually
            // (withDefaultSound, withApsField). The older withPayload()
            // helper was removed — set each field explicitly instead.
            $apns = ApnsConfig::new()
                ->withDefaultSound()
                // mutable-content = 1 lets the Notification Service
                // Extension download and attach the image at runtime.
                // No-op if the app doesn't ship an extension, so safe
                // to always set.
                ->withApsField('mutable-content', 1);

            $message = $message->withApnsConfig($apns);
        }

        return $message;
    }
}
