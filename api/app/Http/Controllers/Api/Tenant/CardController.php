<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Jobs\SendApplePassUpdate;
use App\Jobs\SendGooglePassUpdate;
use App\Models\CardTemplate;
use App\Models\IssuedCard;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CardController extends Controller
{
    /**
     * GET /api/cards
     * List card templates for the current tenant (scoped via BelongsToTenant).
     */
    public function index(): JsonResponse
    {
        $cards = CardTemplate::with(['rewards', 'locations:id'])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $cards]);
    }

    /**
     * POST /api/cards
     * Create a new card template.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateCard($request);

        $card = CardTemplate::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'type' => $data['type'] ?? 'stamp',
            'status' => $data['status'] ?? 'draft',
            'design' => $data['design'],
            'settings' => $data['settings'],
        ]);

        if (! empty($data['rewards'])) {
            foreach ($data['rewards'] as $reward) {
                $card->rewards()->create([
                    'name' => $reward['name'],
                    'stamps_required' => $reward['stamps_required'] ?? $reward['stampsRequired'] ?? 1,
                ]);
            }
        }

        $this->syncLocations($card, $data['location_ids'] ?? []);

        return response()->json(['data' => $card->load(['rewards', 'locations:id'])], 201);
    }

    /**
     * GET /api/cards/{id}
     */
    public function show(string $id): JsonResponse
    {
        $card = CardTemplate::with(['rewards', 'locations:id'])->findOrFail($id);

        // Override the raw `notifications` column with the
        // defaults-merged shape so the editor always sees every
        // trigger, even on templates created before the feature
        // shipped. This keeps the wire payload stable and lets the
        // frontend treat `notifications` as a full, required map.
        $payload = $card->toArray();
        $payload['notifications'] = $card->getNotificationsConfig();

        return response()->json(['data' => $payload]);
    }

    /**
     * PUT /api/cards/{id}
     * Replace rewards in full (simpler than diffing).
     *
     * Any write here affects every issued pkpass descendant of this
     * template — colors, logo, icons, labels, name, locations, the
     * strip image that bakes the stamp icons — everything. So we do
     * TWO things after the write:
     *
     *   1. Bump `pass_updated_at = now()` on every IssuedCard.
     *      Apple's wallet web service uses this as the Last-Modified
     *      header on `/v1/passes/{ptid}/{serial}`; iOS compares it to
     *      its cached copy and refuses to re-download a stale pass.
     *
     *   2. Dispatch SendApplePassUpdate for every IssuedCard.
     *      That job walks `apple_pass_registrations` and fires a
     *      silent APNs push per device. iOS then calls back to the web
     *      service, sees the new Last-Modified, and downloads the
     *      refreshed pkpass (with new colors, new logo, new strip).
     *
     * Without step 2 the design change sits in the DB but customers
     * still see the old look until they manually remove and re-add the
     * pass, or until iOS's lazy ~1x/day polling catches up.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $card = CardTemplate::findOrFail($id);
        $data = $this->validateCard($request);

        $update = [
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'type' => $data['type'] ?? $card->type,
            'status' => $data['status'] ?? $card->status,
            'design' => $data['design'],
            'settings' => $data['settings'],
        ];

        // Lifecycle notifications are optional in the payload —
        // only overwrite when the editor explicitly ships them, so
        // clients that don't yet know about the field never wipe
        // the merchant's work. `sanitizeNotifications()` drops
        // unknown keys and hard-caps message length.
        if (array_key_exists('notifications', $data)) {
            $update['notifications'] = $this->sanitizeNotifications($data['notifications']);
        }

        $card->update($update);

        $card->rewards()->delete();
        if (! empty($data['rewards'])) {
            foreach ($data['rewards'] as $reward) {
                $card->rewards()->create([
                    'name' => $reward['name'],
                    'stamps_required' => $reward['stamps_required'] ?? $reward['stampsRequired'] ?? 1,
                ]);
            }
        }

        // Always sync — passing an empty array clears existing links.
        if (array_key_exists('location_ids', $data)) {
            $this->syncLocations($card, $data['location_ids'] ?? []);
        }

        // Refresh every pkpass currently installed on a customer device.
        // Unconditional: template edits always touch *something* the
        // pkpass renders (design, labels, rewards, name, locations…).
        $this->refreshInstalledPasses($card);

        return response()->json(['data' => $card->fresh(['rewards', 'locations:id'])]);
    }

    /**
     * Bump `pass_updated_at` on every issued card for this template
     * and fan out push updates to BOTH Apple and Google wallets so
     * every customer device refetches the new state (design, colors,
     * logo, labels, rewards, locations, anything that changed).
     *
     * Called from `update()` on every save. One job per platform per
     * card — isolating platforms means a Google API outage can't
     * block Apple pushes and vice versa.
     */
    private function refreshInstalledPasses(CardTemplate $card): void
    {
        $now = now()->timestamp;
        IssuedCard::where('card_template_id', $card->id)
            ->update(['pass_updated_at' => $now]);

        // Fan out pushes — one job per card per platform. Dispatched
        // after-commit so the queue worker always sees the bumped
        // `pass_updated_at` on read-back.
        IssuedCard::where('card_template_id', $card->id)
            ->pluck('id')
            ->each(function (int $cardId): void {
                SendApplePassUpdate::dispatch($cardId)->afterCommit();
                SendGooglePassUpdate::dispatch($cardId)->afterCommit();
            });
    }

    /**
     * DELETE /api/cards/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        CardTemplate::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/cards/{id}/notifications
     *
     * Dedicated endpoint for the editor's Notifications tab. Returns
     * the full trigger map with defaults merged in (so the UI never
     * has to branch on missing keys) plus the canonical list of
     * available trigger keys. Equivalent data is also bundled into
     * the main GET /cards/{id} response — this helper exists for
     * clients that want to refetch just the notifications payload
     * without re-downloading the whole card (e.g. after the merchant
     * edits triggers in a modal).
     */
    public function getNotifications(string $id): JsonResponse
    {
        $card = CardTemplate::findOrFail($id);

        return response()->json([
            'data' => [
                'triggers' => $card->getNotificationsConfig(),
                'available' => CardTemplate::NOTIFICATION_TRIGGERS,
            ],
        ]);
    }

    /**
     * PUT /api/cards/{id}/notifications
     *
     * Targeted writer for the notifications JSON blob. The main
     * PUT /cards/{id} endpoint ALSO accepts `notifications` for the
     * unified save flow — this endpoint is for callers that only
     * want to touch notifications without re-sending the full card
     * template (e.g. a quick "turn off welcome" toggle, an admin
     * API integration, a bulk-update script).
     *
     * Unknown trigger keys are silently dropped and messages are
     * hard-capped at 500 chars to match Apple Wallet's backField
     * display limit.
     */
    public function updateNotifications(Request $request, string $id): JsonResponse
    {
        $card = CardTemplate::findOrFail($id);

        $data = $request->validate([
            'triggers' => ['required', 'array'],
            'triggers.*.enabled' => ['nullable', 'boolean'],
            'triggers.*.message_ar' => ['nullable', 'string', 'max:500'],
            'triggers.*.message_en' => ['nullable', 'string', 'max:500'],
        ]);

        $card->update([
            'notifications' => $this->sanitizeNotifications($data['triggers']),
        ]);

        return response()->json([
            'data' => [
                'triggers' => $card->fresh()->getNotificationsConfig(),
                'available' => CardTemplate::NOTIFICATION_TRIGGERS,
            ],
        ]);
    }

    private function validateCard(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'in:stamp,points,membership,discount,cashback,coupon,multipass,gift'],
            'status' => ['nullable', 'string', 'in:draft,active,inactive'],
            'design' => ['required', 'array'],
            'settings' => ['required', 'array'],
            'rewards' => ['nullable', 'array'],
            'rewards.*.name' => ['required_with:rewards', 'string'],
            'rewards.*.stamps_required' => ['nullable', 'integer', 'min:1'],
            'rewards.*.stampsRequired' => ['nullable', 'integer', 'min:1'],
            // Geofence — link this card to specific branches so the
            // Apple/Google wallet pass surfaces on the customer's lock
            // screen when they enter the branch radius. Hard-capped at
            // 10 by Apple Wallet's spec.
            'location_ids' => ['nullable', 'array', 'max:10'],
            'location_ids.*' => ['integer'],
            // Lifecycle notifications — optional. When present, the
            // sanitize step trims and enforces the 500-char cap from
            // Apple Wallet's backField spec. Shape: map of trigger
            // key → { enabled, message_ar, message_en }.
            'notifications' => ['nullable', 'array'],
            'notifications.*.enabled' => ['nullable', 'boolean'],
            'notifications.*.message_ar' => ['nullable', 'string', 'max:500'],
            'notifications.*.message_en' => ['nullable', 'string', 'max:500'],
        ]);
    }

    /**
     * Normalise a notifications payload: drops unknown trigger keys,
     * coerces booleans, trims strings. Called from `update()` before
     * persisting so the stored JSON always matches the canonical
     * trigger enum.
     */
    private function sanitizeNotifications(array $raw): array
    {
        $clean = [];
        foreach (CardTemplate::NOTIFICATION_TRIGGERS as $key) {
            if (! isset($raw[$key]) || ! is_array($raw[$key])) {
                continue;
            }
            $t = $raw[$key];
            $clean[$key] = [
                'enabled' => (bool) ($t['enabled'] ?? false),
                'message_ar' => trim((string) ($t['message_ar'] ?? '')),
                'message_en' => trim((string) ($t['message_en'] ?? '')),
            ];
        }

        return $clean;
    }

    /**
     * Sync the card's branches via the `card_template_location` pivot.
     *
     * Hard tenant scoping: any incoming location ID that doesn't belong
     * to the same tenant as the card is silently dropped — protects
     * against IDs leaking across tenants. Apple's 10-location cap is
     * also enforced here as the final guard before persistence.
     */
    private function syncLocations(CardTemplate $card, array $locationIds): void
    {
        $locationIds = array_values(array_unique(
            array_map('intval', array_filter($locationIds, fn ($id) => $id > 0))
        ));
        $locationIds = array_slice($locationIds, 0, 10);

        if (empty($locationIds)) {
            $card->locations()->sync([]);

            return;
        }

        $valid = Location::query()
            ->whereIn('id', $locationIds)
            ->where('tenant_id', $card->tenant_id)
            ->pluck('id')
            ->all();

        $card->locations()->sync($valid);
    }
}
