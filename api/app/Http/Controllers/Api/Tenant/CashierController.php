<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Jobs\SendApplePassUpdate;
use App\Jobs\SendGooglePassUpdate;
use App\Models\CardReward;
use App\Models\IssuedCard;
use App\Models\Redemption;
use App\Models\Stamp;
use App\Services\Notifications\CardNotificationDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Cashier (authenticated staff) endpoints for giving stamps and redeeming
 * rewards. All lookups go through `serial_number` (what's on the QR).
 */
class CashierController extends Controller
{
    /**
     * GET /api/cashier/lookup/{serial}
     * Returns the issued card state so the cashier can confirm the customer
     * before acting.
     */
    public function lookup(string $serial): JsonResponse
    {
        // Customer personal data lives on customer_profiles now —
        // pull id/tenant_id/customer_profile_id from `customers`
        // (needed for tenant scoping + the proxy accessor), then
        // pull the actual name/phone columns through the `profile`
        // relation with a narrow select.
        $issued = IssuedCard::with([
            'customer:id,tenant_id,customer_profile_id',
            'customer.profile:id,phone,first_name,last_name',
            'template.rewards',
        ])->where('serial_number', $serial)->firstOrFail();

        return response()->json(['data' => $this->serialize($issued)]);
    }

    /**
     * POST /api/cashier/stamps
     * Body: { serial_number: string, count?: int }
     */
    public function giveStamp(
        Request $request,
        CardNotificationDispatcher $notifications,
    ): JsonResponse {
        $data = $request->validate([
            'serial_number' => ['required', 'string'],
            'count' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $count = $data['count'] ?? 1;

        // Capture the pre-stamp state so the notification dispatcher
        // can detect lifecycle transitions (almost_there → reward_ready
        // crossed the threshold, etc.). We can't read this inside the
        // transaction closure's post-commit callback without an extra
        // query, so we pass it along as a closure capture.
        $previousStamps = 0;
        $stampsRequired = 0;

        $issued = DB::transaction(function () use ($data, $count, $request, &$previousStamps, &$stampsRequired) {
            $issued = IssuedCard::where('serial_number', $data['serial_number'])
                ->lockForUpdate()
                ->firstOrFail();

            $previousStamps = (int) $issued->stamps_count;
            $stampsRequired = (int) ($issued->template->rewards->first()?->stamps_required ?? 0);

            // Daily cap enforcement (if configured)
            $maxPerDay = (int) ($issued->template->settings['maxStampsPerDay'] ?? 0);
            if ($maxPerDay > 0) {
                $givenToday = Stamp::where('issued_card_id', $issued->id)
                    ->whereDate('created_at', today())
                    ->sum('count');
                if (($givenToday + $count) > $maxPerDay) {
                    abort(422, "تجاوز حد الأختام اليومي ({$maxPerDay})");
                }
            }

            Stamp::create([
                'issued_card_id' => $issued->id,
                'given_by_user_id' => $request->user()->id,
                'count' => $count,
                'reason' => 'manual',
            ]);

            $issued->increment('stamps_count', $count);
            $issued->update([
                'last_used_at' => now(),
                'pass_updated_at' => now()->timestamp,
            ]);

            return $issued->fresh(['customer:id,tenant_id,customer_profile_id', 'customer.profile:id,phone,first_name,last_name', 'template.rewards']);
        });

        // Fire automation trigger AFTER the transaction commits.
        if ($issued->customer) {
            event(new \App\Events\StampGiven($issued->customer, $issued, $count));
        }

        // Evaluate lifecycle notifications BEFORE dispatching the
        // generic pass update. If a trigger fires it writes the
        // `announcement_text` back field first, so the single Apple
        // push that follows carries both the new stamp count AND the
        // new announcement in one update cycle.
        if ($stampsRequired > 0) {
            $notifications->afterStampGiven($issued, $previousStamps, $stampsRequired);
        }

        // Push the new stamp count to every Apple Wallet device that has
        // installed this card. The job is dispatched after-commit so the
        // queue worker sees the bumped pass_updated_at.
        SendApplePassUpdate::dispatch($issued->id)->afterCommit();
        SendGooglePassUpdate::dispatch($issued->id)->afterCommit();

        return response()->json(['data' => $this->serialize($issued)]);
    }

    /**
     * POST /api/cashier/stamps/remove
     * Body: { serial_number: string, count?: int }
     *
     * Correction flow: decrement stamps and log a negative-count `refund` row
     * in the stamps table so the audit trail stays intact. The DB CHECK
     * constraint `issued_cards.stamps_count >= 0` prevents underflow.
     */
    public function removeStamp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'serial_number' => ['required', 'string'],
            'count' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $count = $data['count'] ?? 1;

        $issued = DB::transaction(function () use ($data, $count, $request) {
            $issued = IssuedCard::where('serial_number', $data['serial_number'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($issued->stamps_count < $count) {
                abort(422, "لا يمكن الخصم — لدى البطاقة {$issued->stamps_count} طوابع فقط");
            }

            Stamp::create([
                'issued_card_id' => $issued->id,
                'given_by_user_id' => $request->user()->id,
                'count' => -$count,
                'reason' => 'refund',
            ]);

            $issued->decrement('stamps_count', $count);
            $issued->update([
                'last_used_at' => now(),
                'pass_updated_at' => now()->timestamp,
            ]);

            return $issued->fresh(['customer:id,tenant_id,customer_profile_id', 'customer.profile:id,phone,first_name,last_name', 'template.rewards']);
        });

        SendApplePassUpdate::dispatch($issued->id)->afterCommit();
        SendGooglePassUpdate::dispatch($issued->id)->afterCommit();

        return response()->json(['data' => $this->serialize($issued)]);
    }

    /**
     * POST /api/cashier/redemptions
     * Body: { serial_number: string, card_reward_id: int }
     */
    public function redeem(
        Request $request,
        CardNotificationDispatcher $notifications,
    ): JsonResponse {
        $data = $request->validate([
            'serial_number' => ['required', 'string'],
            'card_reward_id' => ['required', 'integer'],
        ]);

        $issued = DB::transaction(function () use ($data, $request) {
            $issued = IssuedCard::where('serial_number', $data['serial_number'])
                ->lockForUpdate()
                ->firstOrFail();

            $reward = CardReward::where('id', $data['card_reward_id'])
                ->where('card_template_id', $issued->card_template_id)
                ->firstOrFail();

            if ($issued->stamps_count < $reward->stamps_required) {
                abort(422, "عدد الأختام غير كافٍ — يحتاج {$reward->stamps_required} ولديه {$issued->stamps_count}");
            }

            Redemption::create([
                'issued_card_id' => $issued->id,
                'card_reward_id' => $reward->id,
                'used_by_user_id' => $request->user()->id,
                'status' => 'used',
                'used_at' => now(),
            ]);

            $issued->decrement('stamps_count', $reward->stamps_required);
            $issued->update([
                'last_used_at' => now(),
                'pass_updated_at' => now()->timestamp,
            ]);

            return $issued->fresh(['customer:id,tenant_id,customer_profile_id', 'customer.profile:id,phone,first_name,last_name', 'template.rewards']);
        });

        // Lifecycle: fire the "redeemed" trigger so the customer's
        // Wallet pass flips to the thank-you message.
        $notifications->fire($issued, 'redeemed');

        SendApplePassUpdate::dispatch($issued->id)->afterCommit();
        SendGooglePassUpdate::dispatch($issued->id)->afterCommit();

        return response()->json(['data' => $this->serialize($issued)]);
    }

    /**
     * POST /api/cashier/cards/{serial}/announce
     * Body: { message: string }
     *
     * Updates the card's announcement back-field. Apple Wallet shows
     * the new value as a lock-screen notification on every device that
     * has installed this card. Pass an empty string to clear the
     * announcement (the back-field stays present but reads empty).
     */
    public function announce(Request $request, string $serial): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:500'],
        ]);

        $issued = IssuedCard::where('serial_number', $serial)
            ->firstOrFail();

        $issued->update([
            'announcement_text' => $data['message'],
            'announcement_updated_at' => now()->timestamp,
            'pass_updated_at' => now()->timestamp,
        ]);

        // Apple: silent back-field update (iOS shows the text on the
        // lock screen only when it notices the changeMessage value
        // changed between pass versions — no sound).
        SendApplePassUpdate::dispatch($issued->id)->afterCommit();

        // Google: pass the message body to the job so it calls
        // loyaltyobject/{id}/addMessage which DOES produce a proper
        // notification with sound + vibration on Android.
        SendGooglePassUpdate::dispatch($issued->id, $data['message'])
            ->afterCommit();

        return response()->json([
            'data' => [
                'serial_number' => $issued->serial_number,
                'message' => $issued->announcement_text,
                'sent_to_devices' => $issued->applePassRegistrations()->count(),
            ],
        ]);
    }

    /**
     * POST /api/cashier/cards/announce-all
     * Body: {
     *   message: string,
     *   template_ids?: int[]          // preferred — narrow to these templates
     *   template_id?: int             // legacy single-template shorthand
     * }
     *
     * Broadcast: writes the same announcement to every active issued
     * card in the current tenant and dispatches one SendApplePassUpdate
     * job per card. Three scoping modes:
     *
     *   - No filter         → every active card in the tenant
     *   - `template_ids`    → only cards whose template is in the list
     *   - `template_id`     → legacy one-template shorthand, kept for
     *                         backwards compat with older clients
     *
     * Cards belonging to other tenants are already excluded by the
     * BelongsToTenant global scope on IssuedCard.
     */
    public function announceAll(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:500'],
            'template_ids' => ['nullable', 'array'],
            'template_ids.*' => ['integer'],
            'template_id' => ['nullable', 'integer'],
        ]);

        // Normalise to a single list of template ids (or null = all).
        $templateIds = [];
        if (! empty($data['template_ids'])) {
            $templateIds = array_values(array_unique(array_map('intval', $data['template_ids'])));
        } elseif (! empty($data['template_id'])) {
            $templateIds = [(int) $data['template_id']];
        }

        $now = now()->timestamp;

        $query = IssuedCard::query()->where('status', '!=', 'inactive');
        if (! empty($templateIds)) {
            $query->whereIn('card_template_id', $templateIds);
        }

        $cardIds = $query->pluck('id');

        // Single bulk UPDATE — much cheaper than N individual saves
        // when broadcasting to thousands of cards.
        IssuedCard::whereIn('id', $cardIds)->update([
            'announcement_text' => $data['message'],
            'announcement_updated_at' => $now,
            'pass_updated_at' => $now,
        ]);

        // Fan out to BOTH wallet platforms. Apple gets a silent
        // background push (lock-screen update only), Google gets a
        // proper notification via loyaltyobject/{id}/addMessage.
        foreach ($cardIds as $id) {
            SendApplePassUpdate::dispatch($id)->afterCommit();
            SendGooglePassUpdate::dispatch($id, $data['message'])
                ->afterCommit();
        }

        return response()->json([
            'data' => [
                'message' => $data['message'],
                'cards_updated' => $cardIds->count(),
                'template_ids' => $templateIds,
            ],
        ]);
    }

    private function serialize(IssuedCard $issued): array
    {
        return [
            'serial_number' => $issued->serial_number,
            'stamps_count' => $issued->stamps_count,
            'status' => $issued->status,
            'last_used_at' => $issued->last_used_at,
            'customer' => [
                'id' => $issued->customer->id,
                'phone' => $issued->customer->phone,
                'name' => $issued->customer->full_name,
            ],
            'template' => [
                'id' => $issued->template->id,
                'name' => $issued->template->name,
                'design' => $issued->template->design,
                'rewards' => $issued->template->rewards->map(fn ($r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'stamps_required' => $r->stamps_required,
                    'can_redeem' => $issued->stamps_count >= $r->stamps_required,
                ]),
            ],
        ];
    }
}
