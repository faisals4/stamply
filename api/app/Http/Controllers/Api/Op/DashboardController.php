<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Controller;
use App\Models\CardTemplate;
use App\Models\Customer;
use App\Models\IssuedCard;
use App\Models\Redemption;
use App\Models\Stamp;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * Platform-wide stats for /op dashboard. Bypasses the BelongsToTenant
 * global scope via `withoutGlobalScopes()` so we see numbers across all
 * tenants.
 */
class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $today = now()->startOfDay();
        $weekAgo = now()->subWeek();
        $monthAgo = now()->subMonth();

        return response()->json([
            'data' => [
                // Merchants
                'tenants_total' => Tenant::count(),
                'tenants_active' => Tenant::where('is_active', true)->count(),
                'tenants_new_month' => Tenant::where('created_at', '>=', $monthAgo)->count(),

                // Staff users
                'users_total' => User::count(),

                // Card templates across platform
                'card_templates_total' => CardTemplate::withoutGlobalScopes()->count(),
                'active_card_templates' => CardTemplate::withoutGlobalScopes()
                    ->where('status', 'active')
                    ->count(),

                // End-customer activity
                'customers_total' => Customer::withoutGlobalScopes()->count(),
                'issued_cards_total' => IssuedCard::withoutGlobalScopes()->count(),
                'stamps_total' => Stamp::withoutGlobalScopes()
                    ->where('count', '>', 0)
                    ->sum('count'),
                'stamps_today' => Stamp::withoutGlobalScopes()
                    ->where('created_at', '>=', $today)
                    ->where('count', '>', 0)
                    ->sum('count'),
                'redemptions_total' => Redemption::withoutGlobalScopes()
                    ->where('status', 'used')
                    ->count(),

                // Activity
                'active_tenants_week' => Tenant::whereIn(
                    'id',
                    Stamp::withoutGlobalScopes()
                        ->where('created_at', '>=', $weekAgo)
                        ->distinct()
                        ->pluck('tenant_id'),
                )->count(),
            ],
        ]);
    }
}
