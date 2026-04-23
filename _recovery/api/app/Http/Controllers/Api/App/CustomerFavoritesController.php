<?php

namespace App\Http\Controllers\Api\App;

use App\Http\Controllers\Controller;
use App\Models\CardTemplate;
use App\Models\CustomerFavorite;
use App\Models\Location;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerFavoritesController extends Controller
{
    /**
     * GET /api/app/favorites
     * Returns the customer's favorite stores with details.
     */
    public function index(Request $request): JsonResponse
    {
        $profileId = $request->user()->id;
        $perPage = min((int) ($request->query('per_page', 20)), 50);

        $paginator = CustomerFavorite::where('customer_profile_id', $profileId)
            ->whereHas('tenant', fn ($q) => $q->where('is_active', true))
            ->with('tenant')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $items = collect($paginator->items())->map(function ($f) {
            $t = $f->tenant;
            $hasLogo = !empty($t->settings['branding']['logo']);
            $logo = $hasLogo ? url("/api/public/tenant/{$t->id}/logo") : null;
            $description = $t->settings['branding']['description'] ?? null;
            $activeCards = CardTemplate::withoutGlobalScope('tenant')
                ->where('tenant_id', $t->id)
                ->where('status', 'active')
                ->count();
            return [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $description,
                'logo_url' => $logo,
                'active_cards_count' => $activeCards,
                'favorited_at' => $f->created_at,
            ];
        })->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * POST /api/app/favorites/{tenantId}
     * Add a store to favorites.
     */
    public function store(Request $request, int $tenantId): JsonResponse
    {
        $profileId = $request->user()->id;
        Tenant::where('is_active', true)->findOrFail($tenantId);

        CustomerFavorite::firstOrCreate([
            'customer_profile_id' => $profileId,
            'tenant_id' => $tenantId,
        ]);

        return response()->json(['ok' => true], 201);
    }

    /**
     * DELETE /api/app/favorites/{tenantId}
     * Remove a store from favorites.
     */
    public function destroy(Request $request, int $tenantId): JsonResponse
    {
        $profileId = $request->user()->id;

        CustomerFavorite::where('customer_profile_id', $profileId)
            ->where('tenant_id', $tenantId)
            ->delete();

        return response()->json(['ok' => true]);
    }
}
