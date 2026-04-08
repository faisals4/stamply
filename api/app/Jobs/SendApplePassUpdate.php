<?php

namespace App\Jobs;

use App\Models\IssuedCard;
use App\Services\Wallet\Apple\ApplePushNotifier;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Fan out APNs silent pushes to every device that has registered for a
 * given issued card. Dispatched after every stamp mutation in
 * CashierController via ->afterCommit() so the DB write is visible by
 * the time the push triggers iOS to call back for the new pass.
 *
 * Idempotent: re-running just sends another harmless ping. Apple will
 * compare its cached Last-Modified against ours and skip the download
 * with a 304 if nothing actually changed.
 */
class SendApplePassUpdate implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public int $issuedCardId) {}

    public function handle(ApplePushNotifier $apns): void
    {
        $card = IssuedCard::withoutGlobalScopes()->find($this->issuedCardId);
        if (! $card) {
            return;
        }

        $registrations = $card->applePassRegistrations()->get();
        if ($registrations->isEmpty()) {
            return;
        }

        $retryable = false;

        foreach ($registrations as $reg) {
            try {
                $status = $apns->push($reg->push_token);
            } catch (Throwable $e) {
                Log::error('[apple-pass-update] APNs push threw', [
                    'card_id' => $card->id,
                    'registration_id' => $reg->id,
                    'error' => $e->getMessage(),
                ]);
                $retryable = true;
                continue;
            }

            if ($status === 410) {
                // Token is no longer valid (pass deleted from Wallet, app
                // uninstalled, etc.). Remove the registration so we stop
                // wasting cycles on it.
                $reg->delete();
            } elseif ($status >= 500 || $status === 0 || $status === 429) {
                // Transient APNs trouble — let the queue retry the whole
                // job rather than only the failing rows. Cheap because
                // successful rows are idempotent.
                $retryable = true;
            }
        }

        if ($retryable) {
            throw new RuntimeException("APNs push had retryable failures for card {$card->id}");
        }
    }
}
