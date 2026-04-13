<?php

namespace App\Services\Notifications;

use App\Jobs\SendApplePassUpdate;
use App\Models\CardTemplate;
use App\Models\IssuedCard;
use Illuminate\Support\Facades\Log;

/**
 * Fires per-template lifecycle notifications through Apple Wallet.
 *
 * Flow:
 *   1. Caller invokes `fire($card, $triggerKey)` from a cashier hook
 *      (stamp given / reward redeemed / card issued).
 *   2. The dispatcher pulls the trigger config from the card's
 *      template (merged with defaults), checks the enabled flag,
 *      picks the message in the customer's locale, renders variables
 *      ({{customer.first_name}}, {{stamps_remaining}}, etc.), writes
 *      it to the issued card's `announcement_text` back field, bumps
 *      `pass_updated_at`, and queues a `SendApplePassUpdate` job.
 *   3. The existing APNs pipeline delivers a silent push to every
 *      iPhone that has the pass installed. iOS compares the back
 *      field's new value to the old one and surfaces a lock-screen
 *      notification automatically via the `changeMessage` template
 *      we ship in pass.json.
 *
 * Idempotency: the evaluator only calls `fire()` when the trigger
 * actually just transitioned (e.g. stamps_count went from required-1
 * to required-0 for `reward_ready`). No per-call rate limiting yet
 * — the transition check is sufficient for the current set of
 * triggers because they can only fire once per state change.
 */
class CardNotificationDispatcher
{
    public function fire(IssuedCard $card, string $triggerKey): void
    {
        // Eager-load the customer + profile so `renderVariables`
        // below reads first_name / full_name through the proxy
        // accessors without lazy queries. Locale still lives on the
        // customer row (per-merchant setting) so we load that too.
        $card->loadMissing(['customer.profile']);

        $template = $card->template;
        if (! $template instanceof CardTemplate) {
            return;
        }

        $config = $template->getNotificationsConfig();
        $trigger = $config[$triggerKey] ?? null;
        if (! $trigger || empty($trigger['enabled'])) {
            return;
        }

        // Locale selection — defaults to Arabic if the customer
        // didn't set one. The `customer.locale` column already
        // stores 'ar' / 'en' from the signup form. It's a per-tenant
        // preference (some merchants always message in English,
        // others in Arabic) so it stays on `customers`, not on
        // the shared profile.
        $locale = $card->customer?->locale ?? 'ar';
        $messageKey = $locale === 'en' ? 'message_en' : 'message_ar';
        $rawMessage = trim((string) ($trigger[$messageKey] ?? ''));

        // Fall back to the other language if the merchant left one
        // empty (common when they only localized to Arabic).
        if ($rawMessage === '') {
            $fallback = $locale === 'en' ? 'message_ar' : 'message_en';
            $rawMessage = trim((string) ($trigger[$fallback] ?? ''));
        }
        if ($rawMessage === '') {
            return;
        }

        $body = $this->renderVariables($rawMessage, $card);

        $now = now()->timestamp;
        $card->update([
            'announcement_text' => $body,
            'announcement_updated_at' => $now,
            'pass_updated_at' => $now,
        ]);

        SendApplePassUpdate::dispatch($card->id)->afterCommit();

        Log::info('[card-notification] fired', [
            'trigger' => $triggerKey,
            'card_id' => $card->id,
            'customer_id' => $card->customer_id,
            'locale' => $locale,
        ]);
    }

    /**
     * Evaluate all relevant triggers after a stamp has been given.
     * Called from CashierController::giveStamp with the before/after
     * stamps_count so we can detect transitions (e.g. moving from
     * "almost there" to "reward ready").
     */
    public function afterStampGiven(IssuedCard $card, int $previousStamps, int $stampsRequired): void
    {
        $current = (int) $card->stamps_count;

        // reward_ready — crossed the required threshold
        if ($previousStamps < $stampsRequired && $current >= $stampsRequired) {
            $this->fire($card, 'reward_ready');
            return;
        }

        // almost_there — exactly one stamp away
        if ($stampsRequired > 1) {
            $target = $stampsRequired - 1;
            if ($previousStamps < $target && $current >= $target) {
                $this->fire($card, 'almost_there');
                return;
            }
        }

        // halfway — passed the 50% mark (rounded down)
        if ($stampsRequired >= 4) {
            $half = (int) floor($stampsRequired / 2);
            if ($previousStamps < $half && $current >= $half) {
                $this->fire($card, 'halfway');
                return;
            }
        }
    }

    /**
     * Turn `{{customer.first_name}}`-style placeholders into real
     * values. Only a handful of variables are supported on purpose —
     * merchants don't need Liquid or Twig here, just names and counts.
     */
    private function renderVariables(string $template, IssuedCard $card): string
    {
        $customer = $card->customer;
        $brand = $card->template?->tenant;
        $reward = $card->template?->rewards->first();
        $stampsRequired = (int) ($reward?->stamps_required ?? 0);
        $stampsCollected = (int) $card->stamps_count;
        $stampsRemaining = max(0, $stampsRequired - $stampsCollected);

        $vars = [
            '{{customer.first_name}}' => $customer?->first_name ?? '',
            '{{customer.full_name}}' => $customer?->full_name ?? '',
            '{{brand.name}}' => $brand?->name ?? '',
            '{{reward.name}}' => $reward?->name ?? '',
            '{{stamps_collected}}' => (string) $stampsCollected,
            '{{stamps_remaining}}' => (string) $stampsRemaining,
            '{{stamps_required}}' => (string) $stampsRequired,
        ];

        return strtr($template, $vars);
    }
}
