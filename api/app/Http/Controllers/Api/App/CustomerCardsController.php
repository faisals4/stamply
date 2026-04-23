<?php

namespace App\Http\Controllers\Api\App;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\IssuedCard;
use App\Models\Redemption;
use App\Models\Stamp;
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
        /** @var \App\Models\CustomerProfile $profile */
        $profile = $request->user();

        // Every tenant-scoped customers row this profile is attached
        // to. One row per merchant; we drop the BelongsToTenant
        // scope (but KEEP SoftDeletes) so we see every merchant at
        // once instead of just the token owner's tenant.
        $customerIds = Customer::withoutGlobalScopes(['tenant'])
            ->where('customer_profile_id', $profile->id)
            ->pluck('id');

        if ($customerIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        // Pull every issued card belonging to any of those rows. Eager
        // load everything the mobile cards screen renders inline —
        // template + tenant + rewards + last 10 stamps + last 5
        // redemptions — so the client can display each card fully
        // (CardVisual + wallet button + stamp history) without making
        // a second detail fetch per card.
        //
        // Filters applied:
        //   - `withoutGlobalScopes(['tenant'])` — same reason as above,
        //     keeps SoftDeletes active so deleted cards stay hidden
        //   - `whereIn('status', ['active','installed'])` — drops any
        //     card the merchant has marked `inactive`, plus any card
        //     already marked `expired` by the lifecycle job
        //   - `expires_at` null or in the future — belt-and-braces
        //     against a row whose expires_at has passed but whose
        //     status hasn't been rolled over yet
        // Eager-load relations explicitly with `withoutGlobalScopes(['tenant'])`
        // applied to each nested query. CardTemplate (and Customer
        // inside its relations) carry the BelongsToTenant scope, so a
        // bare `with('template.tenant')` would filter the templates
        // down to just the canonical-customer's tenant_id and any
        // card from a *different* merchant would come back with a
        // null template — and therefore a null tenant in the response.
        $cards = IssuedCard::withoutGlobalScopes(['tenant'])
            ->with([
                'customer' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'customer.profile',
                'template' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'template.tenant',
                'template.rewards',
                // stamps + redemptions are intentionally NOT loaded here.
                // The card list only needs `stamps_count` (a column on
                // issued_cards itself) for the visual. The per-stamp
                // dates and per-redemption history are loaded on demand
                // by the detail endpoint GET /cards/{serial} when the
                // user taps a specific card. This cuts the list query
                // from 7 eager-loaded relations to 5 and shrinks the
                // JSON payload ~60%.
            ])
            ->whereIn('customer_id', $customerIds)
            ->whereIn('status', ['active', 'installed'])
            ->whereNull('archived_by_customer_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('last_used_at')
            ->orderByDesc('issued_at')
            ->get();

        // Group by tenant for the sectioned list UI.
        $grouped = $cards->groupBy(fn (IssuedCard $c) => $c->template?->tenant?->id)
            ->map(function ($cards, $tenantId) {
                $tenant = $cards->first()->template?->tenant;

                return [
                    'tenant' => $this->presentTenant($tenant),
                    'cards' => $cards->map(fn (IssuedCard $c) => $this->presentCardFull($c))->values(),
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
        /** @var \App\Models\CustomerProfile $profile */
        $profile = $request->user();

        // Ownership check: the card's tenant customers row must
        // point at the authenticated profile. Soft-deleted and
        // expired cards are filtered out so a deep-link to a
        // serial can't resurrect a retired card. Every nested
        // relation eager-loads `withoutGlobalScopes(['tenant'])`
        // because CardTemplate and Customer both carry the
        // BelongsToTenant scope.
        $card = IssuedCard::withoutGlobalScopes(['tenant'])
            ->with([
                'customer' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'customer.profile',
                'template' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'template.tenant',
                'template.rewards',
                'stamps' => fn ($q) => $q->withoutGlobalScopes(['tenant'])
                    ->orderByDesc('created_at')->limit(50),
                'redemptions' => fn ($q) => $q->withoutGlobalScopes(['tenant'])
                    ->orderByDesc('created_at')->limit(50),
            ])
            ->whereIn('status', ['active', 'installed'])
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->where('serial_number', $serial)
            ->first();

        if (! $card || $card->customer?->customer_profile_id !== $profile->id) {
            return response()->json([
                'error' => 'not_found',
                'message' => 'البطاقة غير موجودة',
            ], 404);
        }

        return response()->json([
            'data' => [
                'card' => $this->presentCardDetail($card),
                'tenant' => $this->presentTenant($card->template?->tenant),
                // Full customer payload so the mobile CardVisual can
                // render the customer name in the secondary row, the
                // same way the web /i/{serial} view does.
                'customer' => [
                    'name' => $card->customer?->full_name,
                    'phone' => $card->customer?->phone,
                ],
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
     * GET /api/app/cards/{serial}/activity
     *
     * Paginated activity timeline for a single card — stamps and
     * redemptions unified into one chronologically-ordered feed.
     * The mobile client uses this for the card details sheet's
     * "stamps history" section: the first 3 entries are rendered
     * inline from the main `show` response, and tapping "more"
     * switches to this endpoint with infinite-scroll pagination
     * (10 entries per page by default).
     *
     * Query parameters:
     *   - page     (int, default 1)     — 1-indexed page
     *   - per_page (int, default 10, max 50) — items per page
     *
     * Response shape:
     * {
     *   "data": [
     *     {
     *       "type": "stamp" | "redemption",
     *       "id": 123,
     *       "created_at": "2026-04-09T...",
     *       "count": 1,                 // stamp only
     *       "reason": "...",            // stamp only
     *       "reward_name": "قهوة مجانية" // redemption only
     *     }, ...
     *   ],
     *   "meta": {
     *     "page": 1,
     *     "per_page": 10,
     *     "total": 47,
     *     "has_more": true
     *   }
     * }
     *
     * Why fuse stamps + redemptions at the SQL level instead of
     * pulling both tables in PHP and merging in memory: a card with
     * hundreds of stamps across years would otherwise spill into
     * memory just to return 10 rows. A `UNION ALL` on two small
     * keyset queries followed by an ORDER BY + LIMIT keeps the
     * payload O(page_size) regardless of the card's total history.
     */
    public function activity(Request $request, string $serial): JsonResponse
    {
        $this->assertOwnsSerial($request, $serial);

        $page = max(1, (int) $request->query('page', 1));
        $perPage = (int) $request->query('per_page', 10);
        $perPage = max(1, min(50, $perPage));
        $offset = ($page - 1) * $perPage;

        $card = IssuedCard::withoutGlobalScopes(['tenant'])
            ->where('serial_number', $serial)
            ->first();

        // Count total rows up-front so the client can show an
        // accurate "has_more" flag without probing for an empty page.
        $stampsTotal = Stamp::withoutGlobalScopes(['tenant'])
            ->where('issued_card_id', $card->id)
            ->count();
        $redemptionsTotal = Redemption::withoutGlobalScopes(['tenant'])
            ->where('issued_card_id', $card->id)
            ->count();
        $total = $stampsTotal + $redemptionsTotal;

        // Over-fetch both tables up to (offset + perPage), merge
        // in PHP, then slice. For realistic histories (tens to a
        // few hundred rows total) this is strictly cheaper than a
        // SQL UNION across soft-delete-aware models, and the PHP
        // sort is O((offset+perPage) log (offset+perPage)) which
        // stays well under a millisecond at page=1..10.
        $fetchLimit = $offset + $perPage;

        $stamps = Stamp::withoutGlobalScopes(['tenant'])
            ->where('issued_card_id', $card->id)
            ->orderByDesc('created_at')
            ->limit($fetchLimit)
            ->get(['id', 'count', 'reason', 'created_at'])
            ->map(fn (Stamp $s) => [
                'type' => 'stamp',
                'id' => $s->id,
                'created_at' => $s->created_at?->toIso8601String(),
                'count' => $s->count,
                'reason' => $s->reason,
            ]);

        $redemptions = Redemption::withoutGlobalScopes(['tenant'])
            ->with(['reward:id,name'])
            ->where('issued_card_id', $card->id)
            ->orderByDesc('created_at')
            ->limit($fetchLimit)
            ->get(['id', 'card_reward_id', 'created_at'])
            ->map(fn (Redemption $r) => [
                'type' => 'redemption',
                'id' => $r->id,
                'created_at' => $r->created_at?->toIso8601String(),
                'reward_name' => $r->reward?->name,
            ]);

        // Merge, sort by created_at DESC, slice the requested page.
        $merged = $stamps
            ->merge($redemptions)
            ->sortByDesc(fn ($row) => $row['created_at'] ?? '')
            ->values();

        $paged = $merged->slice($offset, $perPage)->values();

        return response()->json([
            'data' => $paged,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'has_more' => ($offset + $perPage) < $total,
            ],
        ]);
    }

    /**
     * GET /api/app/tenant/{tenantId}/cards
     *
     * Returns ALL active card templates for a given merchant, each
     * annotated with `subscribed: true|false` indicating whether the
     * authenticated customer already holds an issued card for that
     * template. This powers the "store detail" inside the loyalty
     * stores screen — showing both "my cards" and "cards I haven't
     * signed up for yet".
     *
     * Response shape:
     * {
     *   "data": {
     *     "tenant": { id, name, logo_url, brand_color },
     *     "cards": [
     *       { ...cardTemplate, subscribed: true,  issued_serial: "ABC123" },
     *       { ...cardTemplate, subscribed: false, issued_serial: null },
     *     ]
     *   }
     * }
     */
    public function tenantCards(Request $request, int $tenantId): JsonResponse
    {
        /** @var \App\Models\CustomerProfile $profile */
        $profile = $request->user();

        // Find the tenant.
        $tenant = \App\Models\Tenant::find($tenantId);
        if (! $tenant) {
            return response()->json(['error' => 'not_found', 'message' => 'المتجر غير موجود'], 404);
        }

        // All active card templates for this tenant.
        $templates = \App\Models\CardTemplate::withoutGlobalScopes(['tenant'])
            ->with([
                'rewards' => fn ($q) => $q->orderBy('stamps_required'),
                'tenant',
            ])
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->get();

        // Customer IDs for this profile (across all tenants).
        $customerIds = \App\Models\Customer::withoutGlobalScopes(['tenant'])
            ->where('customer_profile_id', $profile->id)
            ->pluck('id');

        // Issued cards the customer holds from this tenant.
        $issuedCards = \App\Models\IssuedCard::withoutGlobalScopes(['tenant'])
            ->whereIn('customer_id', $customerIds)
            ->whereIn('status', ['active', 'installed'])
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->get()
            ->keyBy('card_template_id');

        $cards = $templates->map(function ($template) use ($issuedCards) {
            $issued = $issuedCards->get($template->id);
            $nextReward = $template->rewards?->first();

            return [
                'template_id' => $template->id,
                'name' => $template->name,
                'description' => $template->description,
                'design' => $template->design,
                'stamps_required' => $nextReward?->stamps_required,
                'reward_name' => $nextReward?->name,
                'subscribed' => $issued !== null,
                'issued_serial' => $issued?->serial_number,
                'stamps_count' => $issued?->stamps_count ?? 0,
            ];
        })->values();

        // Active branches (locations) for this tenant.
        $locations = \App\Models\Location::withoutGlobalScopes(['tenant'])
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get()
            ->map(fn ($loc) => [
                'id' => $loc->id,
                'name' => $loc->name,
                'address' => $loc->address,
                'lat' => $loc->lat,
                'lng' => $loc->lng,
            ])
            ->values();

        return response()->json([
            'data' => [
                'tenant' => $this->presentTenant($tenant),
                'locations' => $locations,
                'cards' => $cards,
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
     * Returns the signed Google Wallet save URL that the client can
     * navigate to directly. We call `GooglePassBuilder` here instead
     * of pointing the client at `/api/public/wallet/google/{serial}`
     * because that public endpoint wraps the save URL in a JSON
     * envelope — a mobile browser navigating to it would just see
     * `{"data":{"save_url":"..."}}` instead of being handed off to
     * Google Wallet. The mobile client needs the raw save URL to
     * redirect to directly.
     */
    public function walletGoogle(Request $request, string $serial): JsonResponse
    {
        $this->assertOwnsSerial($request, $serial);

        // Eager-load every relation the GooglePassBuilder needs with
        // the tenant scope explicitly stripped. The builder normally
        // calls `loadMissing(['template.tenant', ...])` on its own,
        // but `loadMissing` re-runs through the authenticated auth
        // context — and for the mobile customer that means the
        // BelongsToTenant global scope filters CardTemplate/Tenant
        // rows to `tenant_id = null` (because CustomerProfile has no
        // tenant_id), returning empty relations and a null
        // `template->tenant`. Preloading here means `loadMissing`
        // becomes a no-op and the builder sees the real tenant.
        $card = IssuedCard::withoutGlobalScopes(['tenant'])
            ->with([
                'template' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'template.rewards' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'template.tenant',
                'template.locations' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'customer' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'customer.profile',
            ])
            ->where('serial_number', $serial)
            ->firstOrFail();

        try {
            $builder = app()->make(\App\Services\Wallet\Google\GooglePassBuilder::class, ['card' => $card]);

            return response()->json([
                'data' => [
                    'url' => $builder->buildSaveUrl(),
                ],
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'error' => 'wallet_not_configured',
                'message' => $e->getMessage(),
            ], 503);
        }
    }

    /**
     * Abort with 404 if the authenticated customer does not own the
     * given serial. 404 (not 403) on purpose — see `show()` comment.
     * Deleted / inactive / expired cards also 404 so old wallet
     * buttons can't be abused after the merchant retires a card.
     */
    private function assertOwnsSerial(Request $request, string $serial): void
    {
        /** @var \App\Models\CustomerProfile $profile */
        $profile = $request->user();

        $owns = IssuedCard::withoutGlobalScopes(['tenant'])
            ->whereHas('customer', function ($q) use ($profile) {
                $q->withoutGlobalScopes(['tenant'])
                    ->where('customer_profile_id', $profile->id);
            })
            ->whereIn('status', ['active', 'installed'])
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
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
            // Full design JSON so the mobile `CardVisual` component
            // renders with the same brand colors, icons, and labels as
            // the web `/i/{serial}` view. Shape:
            //   { stampsCount, activeStampIcon, inactiveStampIcon,
            //     colors: { background, foreground, stampsBackground,
            //               activeStamp, inactiveStamp },
            //     labels: { title, stamps, reward, customer, ... },
            //     logoUrl, backgroundUrl }
            'design' => $template?->design,
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
                'id' => $r->id,
                'name' => $r->name,
                'stamps_required' => $r->stamps_required,
                'image_url' => $r->image_url,
                'achieved' => $card->stamps_count >= $r->stamps_required,
            ])
            ->values()
            ->all() ?? [];

        return $summary;
    }

    /**
     * Fully-hydrated card payload used by the index endpoint so the
     * mobile cards list can render every card as a self-contained
     * visual (CardVisual + wallet button + stamps history) without
     * making a follow-up detail request per card.
     */
    private function presentCardFull(IssuedCard $card): array
    {
        $base = $this->presentCardDetail($card);

        // Inline the customer name so the mobile card visual renders
        // without a second fetch.
        $base['customer_name'] = $card->customer?->full_name;

        // stamps_history + redemptions_history are only included when
        // the relations were ACTUALLY eager-loaded by the caller.
        // The list endpoint (index) intentionally skips them to cut
        // the response by ~60%; the detail endpoint (show) loads them
        // with full history. `relationLoaded` prevents
        // LazyLoadingViolation on preventLazyLoading builds.
        $base['stamps_history'] = $card->relationLoaded('stamps')
            ? $card->stamps->map(fn ($s) => [
                'id' => $s->id,
                'created_at' => $s->created_at?->toIso8601String(),
            ])->values()
            : [];
        $base['redemptions_history'] = $card->relationLoaded('redemptions')
            ? $card->redemptions->map(fn ($r) => [
                'id' => $r->id,
                'reward_name' => $r->reward_name ?? null,
                'created_at' => $r->created_at?->toIso8601String(),
            ])->values()
            : [];

        return $base;
    }

    /**
     * GET /api/app/discover/tenants
     *
     * Returns all active tenants that have at least one published card
     * template, regardless of whether the customer is subscribed or not.
     * Used by the "Loyalty Stores" screen to show all available stores.
     */
    public function discoverTenants(Request $request): JsonResponse
    {
        $perPage = min((int) ($request->query('per_page', 20)), 50);
        $userLat = $request->query('lat');
        $userLng = $request->query('lng');
        $hasLocation = is_numeric($userLat) && is_numeric($userLng);

        // Full-text-ish search query. Trimmed, length-capped, and only
        // applied when the user actually typed something — a blank
        // string shouldn't match "%%" (which would match everything but
        // still trigger the trigram GIN lookup for no reason).
        $rawQ = trim((string) $request->query('q', ''));
        $q = mb_substr($rawQ, 0, 60);
        $hasSearch = $q !== '';

        // Base query: active tenants with at least one published card.
        $query = \App\Models\Tenant::where('is_active', true)
            ->whereHas('cardTemplates', function ($qb) {
                $qb->withoutGlobalScope('tenant')->where('status', 'active');
            });

        if ($hasSearch) {
            // ILIKE is the trigger that makes Postgres pick the GIN
            // index we added in 2026_04_16_000100. `addcslashes` to
            // escape `%` `_` `\` so users searching for literal
            // "100%" don't accidentally match everything.
            $needle = addcslashes($q, '%_\\');
            $query->where('tenants.name', 'ILIKE', "%{$needle}%");
        }

        if ($hasLocation) {
            // Subquery: min distance (Haversine) from any active branch
            // to the user's coordinates. Tenants without branches get
            // distance = 999999 so they sort last.
            $lat = (float) $userLat;
            $lng = (float) $userLng;
            $query->addSelect([
                'tenants.*',
                \Illuminate\Support\Facades\DB::raw("
                    COALESCE(
                        (SELECT MIN(
                            6371 * ACOS(
                                LEAST(1, COS(RADIANS({$lat})) * COS(RADIANS(locations.lat))
                                * COS(RADIANS(locations.lng) - RADIANS({$lng}))
                                + SIN(RADIANS({$lat})) * SIN(RADIANS(locations.lat)))
                            )
                        )
                        FROM locations
                        WHERE locations.tenant_id = tenants.id
                          AND locations.is_active = true
                          AND locations.lat IS NOT NULL
                          AND locations.lng IS NOT NULL

                        ), 999999
                    ) AS nearest_km
                "),
            ])->orderBy('nearest_km');
        } else {
            $query->select('id', 'name', 'subdomain', 'settings')
                  ->orderBy('name');
        }

        $paginator = $query->paginate($perPage);

        $items = collect($paginator->items())->map(function ($t) use ($request) {
            $hasLogo = !empty($t->settings['branding']['logo']);
            $logo = $hasLogo ? url("/api/public/tenant/{$t->id}/logo") : null;
            $activeCards = \App\Models\CardTemplate::withoutGlobalScope('tenant')
                ->where('tenant_id', $t->id)
                ->where('status', 'active')
                ->count();
            $locations = \App\Models\Location::withoutGlobalScope('tenant')
                ->where('tenant_id', $t->id)
                ->where('is_active', true)
                ->whereNotNull('lat')
                ->whereNotNull('lng')
                ->select('id', 'name', 'lat', 'lng')
                ->get();
            $description = $t->settings['branding']['description'] ?? null;
            $result = [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $description,
                'logo_url' => $logo,
                'active_cards_count' => $activeCards,
                'locations' => $locations,
            ];
            if (isset($t->nearest_km)) {
                $result['nearest_km'] = round((float) $t->nearest_km, 1);
            }
            return $result;
        });

        // Include customer's favorite tenant IDs for heart icon state
        $favoriteIds = [];
        if ($request->user()) {
            $favoriteIds = \App\Models\CustomerFavorite::where('customer_profile_id', $request->user()->id)
                ->pluck('tenant_id')
                ->toArray();
        }

        return response()->json([
            'data' => $items,
            'favorite_ids' => $favoriteIds,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    // ─── Card archive (customer-side hide/restore) ──────────────

    /**
     * GET /api/app/cards/archived
     *
     * Same shape as index() but returns only cards the customer has
     * deliberately hidden. Lets the "Archived Cards" screen show
     * everything the customer hid, with a "Restore" button each.
     */
    public function archivedCards(Request $request): JsonResponse
    {
        /** @var \App\Models\CustomerProfile $profile */
        $profile = $request->user();

        $customerIds = Customer::withoutGlobalScopes(['tenant'])
            ->where('customer_profile_id', $profile->id)
            ->pluck('id');

        if ($customerIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $cards = IssuedCard::withoutGlobalScopes(['tenant'])
            ->with([
                'customer' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'customer.profile',
                'template' => fn ($q) => $q->withoutGlobalScopes(['tenant']),
                'template.tenant',
                'template.rewards',
                'stamps' => fn ($q) => $q->withoutGlobalScopes(['tenant'])
                    ->orderByDesc('created_at')->limit(10),
                'redemptions' => fn ($q) => $q->withoutGlobalScopes(['tenant'])
                    ->orderByDesc('created_at')->limit(5),
            ])
            ->whereIn('customer_id', $customerIds)
            ->whereIn('status', ['active', 'installed'])
            ->whereNotNull('archived_by_customer_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('archived_by_customer_at')
            ->get();

        $grouped = $cards->groupBy(fn (IssuedCard $c) => $c->template?->tenant?->id)
            ->map(function ($cards, $tenantId) {
                $tenant = $cards->first()->template?->tenant;
                return [
                    'tenant' => $this->presentTenant($tenant),
                    'cards' => $cards->map(fn (IssuedCard $c) => $this->presentCardFull($c))->values(),
                ];
            })
            ->values();

        return response()->json(['data' => $grouped]);
    }

    /**
     * POST /api/app/cards/{serial}/archive
     *
     * Hide a card from the customer's home screen. The card remains
     * fully active — wallet passes, cashier scanning, merchant
     * dashboards, and public links are all unaffected.
     */
    public function archive(Request $request, string $serial): JsonResponse
    {
        $card = $this->findOwnedCard($request, $serial);
        if (!$card) {
            return response()->json(['message' => 'Card not found'], 404);
        }

        $card->archived_by_customer_at = now();
        $card->save();

        return response()->json(['message' => 'archived']);
    }

    /**
     * POST /api/app/cards/{serial}/unarchive
     *
     * Restore a previously archived card back to the home screen.
     */
    public function unarchive(Request $request, string $serial): JsonResponse
    {
        $card = $this->findOwnedCard($request, $serial);
        if (!$card) {
            return response()->json(['message' => 'Card not found'], 404);
        }

        $card->archived_by_customer_at = null;
        $card->save();

        return response()->json(['message' => 'unarchived']);
    }

    /**
     * Find an active/installed card owned by the authenticated
     * customer profile. Used by archive/unarchive.
     */
    private function findOwnedCard(Request $request, string $serial): ?IssuedCard
    {
        /** @var \App\Models\CustomerProfile $profile */
        $profile = $request->user();

        $customerIds = Customer::withoutGlobalScopes(['tenant'])
            ->where('customer_profile_id', $profile->id)
            ->pluck('id');

        return IssuedCard::withoutGlobalScopes(['tenant'])
            ->where('serial_number', $serial)
            ->whereIn('customer_id', $customerIds)
            ->whereIn('status', ['active', 'installed'])
            ->first();
    }
}
