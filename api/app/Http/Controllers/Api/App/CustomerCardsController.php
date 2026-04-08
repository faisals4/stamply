<?php

namespace App\Http\Controllers\Api\App;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\IssuedCard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Cross-tenant loyalty card list for the native mobile app.
 *
 * This is the controller that delivers the "all my cards in one place"
 * promise — aggregating every IssuedCard across every Customer row
 * that shares the authenticated phone. **Every query must use
 * `withoutGlobalScopes()`** because `BelongsToTenant` would otherwise
 * silently filter the results to just the canonical token owner's
 * tenant.
 */
class CustomerCardsController extends Controller
{
    /**
     * GET /api/app/cards
     *
     * Response shape:
     * {
     *   "data": [
     *     {
     *       "tenant": { id, name, logo_url, brand_color },
     *       "cards":  [ { ...card }, ... ]
     *     },
     *     ...
     *   ]
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $phone = $request->user()->phone;

        // Resolve every customer row tied to this phone.
        $customerIds = Customer::withoutGlobalScopes()
            ->where('phone', $phone)
            ->pluck('id');

        if ($customerIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        // Pull every issued card belonging to any of those rows. Eager
        // load template + tenant + rewards so we can compute progress
        // and render a brand header without N+1 queries.
        $cards = IssuedCard::withoutGlobalScopes()
            ->with(['template.tenant', 'template.rewards'])
            ->whereIn('customer_id', $customerIds)
            ->orderByDesc('last_used_at')
            ->orderByDesc('issued_at')
            ->get();

        // Group by tenant for the sectioned list UI.
        $grouped = $cards->groupBy(fn (IssuedCard $c) => $c->template?->tenant?->id)
            ->map(function ($cards, $tenantId) {
                $tenant = $cards->first()->template?->tenant;

                return [
                    'tenant' => $this->presentTenant($tenant),
                    'cards' => $cards->map(fn (IssuedCard $c) => $this->presentCardSummary($c))->values(),
                ];
            })
            ->values();

        return response()->json(['data' => $grouped]);
    }

    /**
     * GET /api/app/cards/{serial}
     *
     * Full detail for a single card — stamps history + redemption
     * history + next reward. Authorization: the card's customer must
     * share a phone with the authenticated user. Any mismatch returns
     * 404 (NOT 403) to avoid leaking the existence of serials belonging
     * to other people.
     */
    public function show(Request $request, string $serial): JsonResponse
    {
        $phone = $request->user()->phone;

        $card = IssuedCard::withoutGlobalScopes()
            ->with([
                'customer',
                'template.tenant',
                'template.rewards',
                'stamps' => fn ($q) => $q->orderByDesc('created_at')->limit(50),
                'redemptions' => fn ($q) => $q->orderByDesc('created_at')->limit(50),
            ])
            ->where('serial_number', $serial)
            ->first();

        if (! $card || $card->customer?->phone !== $phone) {
            return response()->json([
                'error' => 'not_found',
                'message' => 'البطاقة غير موجودة',
            ], 404);
        }

        return response()->json([
            'data' => [
                'card' => $this->presentCardDetail($card),
                'tenant' => $this->presentTenant($card->template?->tenant),
                'stamps' => $card->stamps->map(fn ($s) => [
                    'id' => $s->id,
                    'created_at' => $s->created_at?->toIso8601String(),
                ])->values(),
                'redemptions' => $card->redemptions->map(fn ($r) => [
                    'id' => $r->id,
                    'reward_name' => $r->reward_name ?? null,
                    'created_at' => $r->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    /**
     * POST /api/app/cards/{serial}/wallet/apple
     * Returns the signed .pkpass URL the client can hand to iOS Wallet.
     *
     * We reuse the existing public endpoint inside WalletController —
     * there's no benefit in re-signing through a new path, and the
     * serial is already an unguessable Crockford token so exposing the
     * URL to an authenticated mobile client is fine.
     */
    public function walletApple(Request $request, string $serial): JsonResponse
    {
        $this->assertOwnsSerial($request, $serial);

        return response()->json([
            'data' => [
                'url' => url("/api/public/wallet/apple/{$serial}.pkpass"),
            ],
        ]);
    }

    /**
     * POST /api/app/cards/{serial}/wallet/google
     * Returns the Google Wallet save URL.
     */
    public function walletGoogle(Request $request, string $serial): JsonResponse
    {
        $this->assertOwnsSerial($request, $serial);

        return response()->json([
            'data' => [
                'url' => url("/api/public/wallet/google/{$serial}"),
            ],
        ]);
    }

    /**
     * Abort with 404 if the authenticated customer does not own the
     * given serial. 404 (not 403) on purpose — see `show()` comment.
     */
    private function assertOwnsSerial(Request $request, string $serial): void
    {
        $phone = $request->user()->phone;

        $owns = IssuedCard::withoutGlobalScopes()
            ->whereHas('customer', function ($q) use ($phone) {
                $q->withoutGlobalScopes()->where('phone', $phone);
            })
            ->where('serial_number', $serial)
            ->exists();

        if (! $owns) {
            abort(404, 'البطاقة غير موجودة');
        }
    }

    private function presentTenant($tenant): ?array
    {
        if (! $tenant) {
            return null;
        }

        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'logo_url' => url("/api/public/tenant/{$tenant->id}/logo"),
            'brand_color' => data_get($tenant->settings, 'brand.color'),
        ];
    }

    private function presentCardSummary(IssuedCard $card): array
    {
        $template = $card->template;
        $nextReward = $template?->rewards?->sortBy('stamps_required')?->first();
        $stampsRequired = $nextReward?->stamps_required;

        return [
            'serial' => $card->serial_number,
            'name' => $template?->name,
            'description' => $template?->description,
            'stamps_count' => $card->stamps_count,
            'stamps_required' => $stampsRequired,
            'next_reward' => $nextReward ? [
                'name' => $nextReward->name,
                'stamps_required' => $nextReward->stamps_required,
                'image_url' => $nextReward->image_url,
            ] : null,
            'status' => $card->status,
            'issued_at' => $card->issued_at?->toIso8601String(),
            'last_used_at' => $card->last_used_at?->toIso8601String(),
        ];
    }

    private function presentCardDetail(IssuedCard $card): array
    {
        $summary = $this->presentCardSummary($card);

        // Full reward ladder for the detail screen so the UI can show
        // "Reward 1: 10 stamps (ready), Reward 2: 20 stamps (2 more)".
        $summary['all_rewards'] = $card->template?->rewards
            ?->sortBy('stamps_required')
            ->map(fn ($r) => [
                'name' => $r->name,
                'stamps_required' => $r->stamps_required,
                'image_url' => $r->image_url,
                'achieved' => $card->stamps_count >= $r->stamps_required,
            ])
            ->values()
            ->all() ?? [];

        return $summary;
    }
}
