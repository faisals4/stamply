<?php

namespace App\Jobs;

use App\Models\IssuedCard;
use App\Services\Wallet\Google\GooglePassBuilder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Push the latest loyaltyObject state to Google Wallet for a single
 * issued card. Optionally also fires an announcement (shown as a
 * lock-screen notification on the customer's Android device).
 *
 * Mirrors `SendApplePassUpdate` on the Apple side. Both jobs run in
 * the same queue and are dispatched in lockstep by CashierController
 * / CardController so iPhone and Android customers see identical
 * state at the same time.
 *
 * Idempotent: Google's PUT /loyaltyObject is a full replace, so
 * re-running the job just overwrites the current state with the same
 * values — no side effects.
 */
class SendGooglePassUpdate implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public int $issuedCardId,
        public ?string $announcementText = null,
    ) {}

    public function handle(): void
    {
        $card = IssuedCard::withoutGlobalScopes()->find($this->issuedCardId);
        if (! $card) {
            return;
        }

        try {
            $builder = app()->make(GooglePassBuilder::class, ['card' => $card]);

            // Step 1 — always push the current object state. This
            // keeps Google's server-side copy in sync with whatever
            // is in our DB (design changes, stamp count, locations).
            $builder->pushLatestState();

            // Step 2 — if an announcement was attached, fire an
            // addMessage call. On Google Wallet this produces an
            // actual alert notification (with sound + vibration),
            // unlike Apple Wallet's silent changeMessage flow.
            if ($this->announcementText !== null && $this->announcementText !== '') {
                $builder->sendAnnouncement($this->announcementText);
            }
        } catch (RuntimeException $e) {
            // Google Wallet not configured, or transient 5xx — let
            // the queue retry. `tries = 3` means we give up after
            // ~3 minutes per card.
            Log::warning('[google-pass-update] failed', [
                'card_id' => $card->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        } catch (Throwable $e) {
            Log::error('[google-pass-update] unexpected error', [
                'card_id' => $card->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
