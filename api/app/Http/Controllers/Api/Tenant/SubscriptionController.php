<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\SubscriptionLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Tenant-facing subscription info. Read-only — tenants cannot modify
 * their own subscription; that is done by the platform operator via /op.
 */
class SubscriptionController extends Controller
{
    /**
     * GET /api/subscription
     * Returns the current tenant's subscription details.
     */
    public function show(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $plan = $tenant->planModel();

        // Usage counts
        $cardsUsed = $tenant->cardTemplates()->count();
        $locationsUsed = Location::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)->count();
        $usersCount = $tenant->users()->count();

        // Recent subscription logs
        $recentLogs = SubscriptionLog::where('tenant_id', $tenant->id)
            ->with('performer:id,name')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'action' => $log->action,
                'plan_from' => $log->plan_from,
                'plan_to' => $log->plan_to,
                'starts_at' => $log->starts_at,
                'ends_at' => $log->ends_at,
                'amount' => $log->amount,
                'payment_method' => $log->payment_method,
                'notes' => $log->notes,
                'performed_by_name' => $log->performer?->name,
                'created_at' => $log->created_at,
            ]);

        return response()->json([
            'data' => [
                'plan' => $tenant->plan,
                'plan_name_ar' => $plan?->name_ar ?? $tenant->plan,
                'plan_name_en' => $plan?->name_en ?? $tenant->plan,
                'subscription_status' => $tenant->subscriptionStatus(),
                'is_trial' => $tenant->isTrial(),
                'trial_ends_at' => $tenant->trial_ends_at,
                'subscription_starts_at' => $tenant->subscription_starts_at,
                'subscription_ends_at' => $tenant->subscription_ends_at,
                'plan_price' => $tenant->plan_price,
                'plan_interval' => $tenant->plan_interval,
                'days_remaining' => $tenant->daysRemaining(),
                'created_at' => $tenant->created_at,
                'plan_details' => $plan ? [
                    'monthly_price' => $plan->monthly_price,
                    'yearly_price' => $plan->yearly_price,
                    'max_cards' => $plan->max_cards,
                    'max_locations' => $plan->max_locations,
                    'max_users' => $plan->max_users,
                    'trial_days' => $plan->trial_days,
                    'features' => $plan->features,
                ] : null,
                'usage' => [
                    'cards' => $cardsUsed,
                    'cards_max' => $plan?->max_cards ?? 1,
                    'locations' => $locationsUsed,
                    'locations_max' => $plan?->max_locations ?? 1,
                    'users' => $usersCount,
                    'users_max' => $plan?->max_users ?? 1,
                ],
                'recent_logs' => $recentLogs,
            ],
        ]);
    }
}
