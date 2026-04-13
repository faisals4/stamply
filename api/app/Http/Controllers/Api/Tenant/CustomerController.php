<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\IssuedCard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    use PaginatesResponses;

    /**
     * GET /api/customers
     * List customers for the current tenant with issued-cards count.
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('q');
        $filter = $request->query('filter'); // active|inactive|new|birthday_month

        // `with('profile')` is mandatory — every serialized field
        // below (phone, first_name, email, birthdate) is a proxy
        // accessor on Customer that reads from the related
        // CustomerProfile. Without eager loading we'd get N+1.
        $query = Customer::query()
            ->with('profile')
            ->withCount('issuedCards')
            ->orderByDesc('last_activity_at');

        if ($search) {
            // Personal fields live on the profile now — search via
            // whereHas on the profile relation. Phone is on the
            // profile too.
            $query->whereHas('profile', function ($q) use ($search) {
                $q->where('phone', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        switch ($filter) {
            // Legacy "active" = last 30 days (kept for backwards compat).
            case 'active':
                $query->where('last_activity_at', '>=', now()->subDays(30));
                break;
            // 7-day active — matches the dashboard "عملاء نشطون هذا الأسبوع" card.
            case 'active_week':
                $query->where('last_activity_at', '>=', now()->subDays(7));
                break;
            case 'inactive':
                $query->where(function ($q) {
                    $q->whereNull('last_activity_at')
                        ->orWhere('last_activity_at', '<', now()->subDays(30));
                });
                break;
            // Legacy "new" = last 7 days (kept for backwards compat).
            case 'new':
                $query->where('created_at', '>=', now()->subDays(7));
                break;
            // 30-day new — matches the dashboard "عملاء جدد هذا الشهر" card.
            case 'new_month':
                $query->where('created_at', '>=', now()->subDays(30));
                break;
            case 'birthday_month':
                // birthdate moved to customer_profiles — fan the
                // filter out to the relation.
                $query->whereHas('profile', fn ($q) => $q->whereMonth('birthdate', now()->month));
                break;
            case 'birthday_week':
                // Birthdays in the next 7 days (compared by day-of-year to
                // handle year rollover across Dec 26 → Jan 2).
                $query->whereHas('profile', function ($q) {
                    $q->whereNotNull('birthdate')
                        ->whereRaw('((extract(doy from birthdate)::int - extract(doy from now())::int + 366) % 366) BETWEEN 0 AND 7');
                });
                break;
        }

        $paginator = $query->paginate($this->resolvePerPage($request));
        $paginator->through(fn ($c) => [
            'id' => $c->id,
            'phone' => $c->phone,
            'first_name' => $c->first_name,
            'last_name' => $c->last_name,
            'full_name' => $c->full_name,
            'email' => $c->email,
            'birthdate' => $c->birthdate?->toDateString(),
            'gender' => $c->gender,
            // Verification state and locked fields flow up from
            // the central profile so the dashboard can badge
            // verified customers and disable locked form inputs.
            'phone_verified_at' => $c->phone_verified_at?->toIso8601String(),
            'locked_fields' => $c->locked_fields,
            'source_utm' => $c->source_utm,
            'issued_cards_count' => $c->issued_cards_count,
            'last_activity_at' => $c->last_activity_at,
            'created_at' => $c->created_at,
        ]);

        return $this->paginated($paginator);
    }

    /**
     * GET /api/customers/{id}
     * Returns full customer profile + every issued card with its full activity
     * log (stamps + redemptions, merged and sorted by date) and stats.
     */
    public function show(string $id): JsonResponse
    {
        $customer = Customer::with([
            // Profile carries all personal fields (phone, name,
            // email, birthdate, gender, verification, locks).
            'profile',
            'issuedCards.template:id,name,design',
            'issuedCards.stamps' => fn ($q) => $q->orderBy('created_at', 'desc'),
            'issuedCards.stamps.givenBy:id,name',
            'issuedCards.redemptions' => fn ($q) => $q->orderBy('created_at', 'desc'),
            'issuedCards.redemptions.reward:id,name,stamps_required',
        ])->findOrFail($id);

        // Aggregate stats across all cards
        $totalEarned = 0;
        $totalRedeemed = 0;
        foreach ($customer->issuedCards as $ic) {
            $totalEarned += $ic->stamps->where('count', '>', 0)->sum('count');
            $totalRedeemed += $ic->redemptions->where('status', 'used')->count();
        }

        return response()->json(['data' => [
            'id' => $customer->id,
            'phone' => $customer->phone,
            'first_name' => $customer->first_name,
            'last_name' => $customer->last_name,
            'full_name' => $customer->full_name,
            'email' => $customer->email,
            'birthdate' => $customer->birthdate?->toDateString(),
            'gender' => $customer->gender,
            'phone_verified_at' => $customer->phone_verified_at?->toIso8601String(),
            'locked_fields' => $customer->locked_fields,
            'source_utm' => $customer->source_utm,
            'last_activity_at' => $customer->last_activity_at,
            'created_at' => $customer->created_at,
            'stats' => [
                'cards_count' => $customer->issuedCards->count(),
                'total_stamps_earned' => $totalEarned,
                'total_rewards_redeemed' => $totalRedeemed,
                'days_since_signup' => $customer->created_at?->diffInDays(now()),
            ],
            // Issued cards summary. Activity is NO LONGER returned inline —
            // the /admin/customers/:id page fetches each card's activity
            // separately via the paginated cardActivity endpoint below.
            'issued_cards' => $customer->issuedCards->map(function ($ic) {
                return [
                    'id' => $ic->id,
                    'serial_number' => $ic->serial_number,
                    'stamps_count' => $ic->stamps_count,
                    'status' => $ic->status,
                    'issued_at' => $ic->issued_at,
                    'last_used_at' => $ic->last_used_at,
                    'view_url' => '/i/'.$ic->serial_number,
                    'template' => [
                        'id' => $ic->template->id,
                        'name' => $ic->template->name,
                        'design' => $ic->template->design,
                    ],
                    'stats' => [
                        'stamps_earned' => $ic->stamps->where('count', '>', 0)->sum('count'),
                        'rewards_redeemed' => $ic->redemptions->where('status', 'used')->count(),
                        'total_activity' => $ic->stamps->count() + $ic->redemptions->count(),
                    ],
                ];
            }),
        ]]);
    }

    /**
     * GET /api/customers/{customer}/cards/{issued}/activity
     *
     * Paginated unified activity feed (stamps + redemptions) for a single
     * issued card. Used by the activity log block on /admin/customers/:id
     * instead of shipping the whole history inline with the show() payload.
     *
     * Filters: kind (stamp|redemption), from, to
     */
    public function cardActivity(Request $request, string $customer, string $issued): JsonResponse
    {
        // Tenant-scoped via BelongsToTenant on IssuedCard.
        $card = IssuedCard::where('id', $issued)
            ->where('customer_id', $customer)
            ->firstOrFail();

        $kind = $request->query('kind');
        $from = $request->query('from');
        $to = $request->query('to');

        // Build a unified union of stamps + redemptions via raw DB query
        // builders so pagination works on the merged result set. Postgres
        // handles this efficiently with the per-card indexes.
        $stampQuery = DB::table('stamps')
            ->where('issued_card_id', $card->id)
            ->selectRaw("'stamp' as kind, count, reason, given_by_user_id as actor_id, null::bigint as reward_id, null::varchar as code, created_at as at");

        $redemptionQuery = DB::table('redemptions')
            ->where('issued_card_id', $card->id)
            ->selectRaw("'redemption' as kind, null::int as count, null::varchar as reason, used_by_user_id as actor_id, card_reward_id as reward_id, code, COALESCE(used_at, created_at) as at");

        if ($kind === 'stamp') {
            $inner = $stampQuery;
        } elseif ($kind === 'redemption') {
            $inner = $redemptionQuery;
        } else {
            $inner = $stampQuery->unionAll($redemptionQuery);
        }

        // Wrap as a subquery so ORDER BY + WHERE apply after the UNION.
        $wrapper = DB::query()->fromSub($inner, 'a');
        if ($from) $wrapper->whereDate('at', '>=', $from);
        if ($to) $wrapper->whereDate('at', '<=', $to);
        $wrapper->orderByDesc('at');

        $paginator = $wrapper->paginate($this->resolvePerPage($request));

        // Hydrate user/reward names for the current page only.
        $items = collect($paginator->items());
        $actorIds = $items->pluck('actor_id')->filter()->unique();
        $rewardIds = $items->pluck('reward_id')->filter()->unique();
        $actors = \App\Models\User::whereIn('id', $actorIds)->pluck('name', 'id');
        $rewards = \App\Models\CardReward::whereIn('id', $rewardIds)->pluck('name', 'id');

        $paginator->through(fn ($row) => [
            'kind' => $row->kind,
            'count' => $row->count,
            'reason' => $row->reason,
            'by' => $row->actor_id ? ($actors[$row->actor_id] ?? null) : null,
            'reward_name' => $row->reward_id ? ($rewards[$row->reward_id] ?? null) : null,
            'code' => $row->code,
            'at' => $row->at,
        ]);

        return $this->paginated($paginator);
    }

    public function store(Request $request)
    {
        abort(405, 'Customers are created via the public issue endpoint.');
    }

    /**
     * PUT /api/customers/{id}
     * Update editable profile fields for a customer.
     *
     * Personal fields (first_name, last_name, email, birthdate,
     * phone) live on the central `customer_profiles` table; this
     * method forwards them there after checking each one against
     * the profile's `locked_fields` list. If ANY requested field
     * is locked by the customer, the whole request is refused
     * with HTTP 423 Locked — the merchant sees a clear error
     * saying which field(s) are protected.
     *
     * Phone changes are still tenant-unique for safety: two
     * customers in the same tenant can't share a phone. Merchants
     * rarely need to edit phone though, so this is a fallback
     * for support tickets more than anything.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $customer = Customer::with('profile')->findOrFail($id);

        $data = $request->validate([
            'first_name' => ['nullable', 'string', 'max:64'],
            'last_name' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:120'],
            'phone' => ['nullable', 'string', 'min:5', 'max:32'],
            'birthdate' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'in:male,female'],
        ]);

        // Drop fields the client didn't send so we don't blank out
        // existing profile values during a partial update.
        $present = array_filter(
            array_keys($data),
            fn ($k) => $request->has($k),
        );

        // Lock check: any requested field that the customer has
        // claimed via the mobile app is off-limits. Phone is
        // ALWAYS considered locked for verified profiles — it's
        // the identity anchor, changing it should never happen
        // from the merchant side.
        $profile = $customer->profile;
        if (! $profile) {
            abort(500, 'Customer has no profile — data corruption.');
        }

        $lockedFields = $profile->locked_fields ?? [];
        if ($profile->isPhoneVerified()) {
            $lockedFields[] = 'phone';
        }

        $conflicts = array_values(array_intersect($present, $lockedFields));
        if (! empty($conflicts)) {
            return response()->json([
                'error' => 'locked_fields',
                'message' => 'هذا العميل يتحكم بمعلوماته من تطبيق Stamply. لا يمكن تعديل الحقول المحمية.',
                'locked' => $conflicts,
            ], 423);
        }

        // Phone uniqueness within tenant when changing. Phone
        // lives on the profile now but the merchant's
        // expectation is "no two of MY customers share a phone",
        // so we check within the tenant.
        if (! empty($data['phone']) && $data['phone'] !== $profile->phone) {
            $exists = Customer::whereHas('profile', fn ($q) => $q->where('phone', $data['phone']))
                ->where('tenant_id', $customer->tenant_id)
                ->where('id', '!=', $customer->id)
                ->exists();
            if ($exists) {
                abort(422, 'هذا الرقم مستخدم من قِبَل عميل آخر');
            }
        }

        // Split updates: personal fields go to the profile, any
        // relationship fields (none currently — locale is the
        // only tenant-scoped field and it isn't in the update
        // payload) stay on the customer row.
        $profileUpdates = array_intersect_key($data, array_flip([
            'first_name', 'last_name', 'email', 'phone', 'birthdate', 'gender',
        ]));
        $profileUpdates = array_filter(
            $profileUpdates,
            fn ($k) => in_array($k, $present, true),
            ARRAY_FILTER_USE_KEY,
        );

        if (! empty($profileUpdates)) {
            $profile->update($profileUpdates);
        }

        // Reload the customer with the fresh profile so the response
        // body reflects the committed state. Eloquent's default
        // `toArray()` doesn't include attribute accessors, so we
        // serialize the fields explicitly to guarantee the caller
        // sees the same shape as GET /api/customers/{id}.
        $customer->refresh();
        $customer->load('profile');

        return response()->json(['data' => [
            'id' => $customer->id,
            'phone' => $customer->phone,
            'first_name' => $customer->first_name,
            'last_name' => $customer->last_name,
            'full_name' => $customer->full_name,
            'email' => $customer->email,
            'birthdate' => $customer->birthdate?->toDateString(),
            'gender' => $customer->gender,
            'phone_verified_at' => $customer->phone_verified_at?->toIso8601String(),
            'locked_fields' => $customer->locked_fields,
            'source_utm' => $customer->source_utm,
            'last_activity_at' => $customer->last_activity_at,
            'created_at' => $customer->created_at,
            'updated_at' => $customer->updated_at,
        ]]);
    }

    public function destroy(string $id): JsonResponse
    {
        Customer::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }
}
