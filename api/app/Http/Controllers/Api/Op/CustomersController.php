<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Models\Customer;
use App\Models\CustomerProfile;
use App\Models\IssuedCard;
use App\Models\Stamp;
use App\Models\Redemption;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CustomersController extends Controller
{
    use PaginatesResponses;

    /**
     * List all customer profiles across all tenants, ordered by newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $query = CustomerProfile::query()
            ->withCount('customers')
            ->orderByDesc('created_at');

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($this->resolvePerPage($request));

        $profileIds = $paginator->getCollection()->pluck('id');

        $issuedCounts = IssuedCard::withoutGlobalScopes()
            ->selectRaw('customers.customer_profile_id, count(issued_cards.id) as total')
            ->join('customers', 'customers.id', '=', 'issued_cards.customer_id')
            ->whereIn('customers.customer_profile_id', $profileIds)
            ->whereNull('issued_cards.deleted_at')
            ->groupBy('customers.customer_profile_id')
            ->pluck('total', 'customers.customer_profile_id');

        $paginator->through(fn (CustomerProfile $p) => [
            'id' => $p->id,
            'phone' => $p->phone,
            'first_name' => $p->first_name,
            'last_name' => $p->last_name,
            'full_name' => trim(($p->first_name ?? '') . ' ' . ($p->last_name ?? '')),
            'email' => $p->email,
            'phone_verified_at' => $p->phone_verified_at,
            'gender' => $p->gender,
            'tenants_count' => $p->customers_count,
            'issued_cards_count' => $issuedCounts[$p->id] ?? 0,
            'created_at' => $p->created_at,
        ]);

        return $this->paginated($paginator);
    }

    /**
     * Show a single customer profile with all tenant enrollments and stats.
     */
    public function show(string $id): JsonResponse
    {
        $profile = CustomerProfile::findOrFail($id);

        $customers = Customer::withoutGlobalScopes()
            ->where('customer_profile_id', $profile->id)
            ->with('tenant:id,name')
            ->get();

        $customerIds = $customers->pluck('id');

        $issuedCards = IssuedCard::withoutGlobalScopes()
            ->whereIn('customer_id', $customerIds)
            ->with('template:id,name,tenant_id')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($ic) => [
                'id' => $ic->id,
                'serial_number' => $ic->serial_number,
                'card_name' => $ic->template?->name,
                'tenant_id' => $ic->tenant_id,
                'stamps_count' => $ic->stamps_count,
                'status' => $ic->status,
                'issued_at' => $ic->issued_at,
                'installed_at' => $ic->installed_at,
                'installed_via' => $ic->installed_via,
                'last_used_at' => $ic->last_used_at,
                'expires_at' => $ic->expires_at,
            ]);

        $totalStamps = Stamp::withoutGlobalScopes()
            ->whereIn('issued_card_id', $issuedCards->pluck('id'))
            ->sum('count');

        $totalRedemptions = Redemption::withoutGlobalScopes()
            ->whereIn('issued_card_id', $issuedCards->pluck('id'))
            ->count();

        $pushTokensCount = \App\Models\PushToken::withoutGlobalScopes()
            ->whereIn('customer_id', $customerIds)
            ->count();

        $favorites = \DB::table('customer_favorites')
            ->where('customer_profile_id', $profile->id)
            ->join('tenants', 'tenants.id', '=', 'customer_favorites.tenant_id')
            ->select('customer_favorites.id', 'customer_favorites.tenant_id', 'tenants.name as tenant_name', 'customer_favorites.created_at')
            ->orderByDesc('customer_favorites.created_at')
            ->get();

        $tenants = $customers->map(fn ($c) => [
            'id' => $c->tenant_id,
            'name' => $c->tenant?->name,
            'customer_id' => $c->id,
            'locale' => $c->locale,
            'source_utm' => $c->source_utm,
            'last_activity_at' => $c->last_activity_at,
            'created_at' => $c->created_at,
            'issued_cards_count' => $issuedCards->where('tenant_id', $c->tenant_id)->count(),
        ]);

        return response()->json([
            'data' => [
                'id' => $profile->id,
                'phone' => $profile->phone,
                'first_name' => $profile->first_name,
                'last_name' => $profile->last_name,
                'full_name' => trim(($profile->first_name ?? '') . ' ' . ($profile->last_name ?? '')),
                'email' => $profile->email,
                'phone_verified_at' => $profile->phone_verified_at,
                'birthdate' => $profile->birthdate,
                'gender' => $profile->gender,
                'locked_fields' => $profile->locked_fields ?? [],
                'created_at' => $profile->created_at,
                'stats' => [
                    'tenants' => $customers->count(),
                    'issued_cards' => $issuedCards->count(),
                    'stamps' => (int) $totalStamps,
                    'redemptions' => $totalRedemptions,
                    'push_tokens' => $pushTokensCount,
                ],
                'tenants' => $tenants,
                'favorites' => $favorites,
            ],
        ]);
    }

    /**
     * GET /op/customers/{id}/cards — paginated issued cards for a customer profile.
     */
    public function cards(Request $request, string $id): JsonResponse
    {
        $profile = CustomerProfile::findOrFail($id);

        $customerIds = Customer::withoutGlobalScopes()
            ->where('customer_profile_id', $profile->id)
            ->pluck('id');

        $paginator = IssuedCard::withoutGlobalScopes()
            ->whereIn('customer_id', $customerIds)
            ->with('template:id,name,tenant_id')
            ->orderByDesc('created_at')
            ->paginate($this->resolvePerPage($request));

        $paginator->through(fn ($ic) => [
            'id' => $ic->id,
            'serial_number' => $ic->serial_number,
            'card_name' => $ic->template?->name,
            'tenant_id' => $ic->tenant_id,
            'stamps_count' => $ic->stamps_count,
            'status' => $ic->status,
            'issued_at' => $ic->issued_at,
            'installed_at' => $ic->installed_at,
            'installed_via' => $ic->installed_via,
            'last_used_at' => $ic->last_used_at,
            'expires_at' => $ic->expires_at,
        ]);

        return $this->paginated($paginator);
    }

    /**
     * Unlock a customer profile's locked fields.
     */
    public function unlock(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
        ]);

        $profile = CustomerProfile::where('phone', $data['phone'])->first();
        if (! $profile) {
            return response()->json(['error' => 'profile_not_found'], 404);
        }

        $before = $profile->locked_fields ?? [];
        $profile->locked_fields = null;
        $profile->save();

        Log::info('[op] customer profile unlocked', [
            'profile_id' => $profile->id,
            'phone' => $profile->phone,
            'cleared_fields' => $before,
            'admin_id' => $request->user()?->id,
            'admin_email' => $request->user()?->email,
        ]);

        return response()->json([
            'data' => [
                'id' => $profile->id,
                'phone' => $profile->phone,
                'locked_fields' => [],
                'cleared' => $before,
            ],
        ]);
    }
}
