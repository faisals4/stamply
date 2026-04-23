<?php

namespace App\Http\Middleware;

use App\Models\Location;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Plan quota enforcement middleware — حدود الباقة.
 *
 * Prevents creating resources beyond the plan's allowed limits.
 * Applied ONLY on creation routes (POST), not on updates or deletes.
 *
 * Limits enforced:
 *   plan.quota:cards     → Plan.max_cards     (POST /cards)
 *   plan.quota:locations → Plan.max_locations  (POST /locations)
 *   plan.quota:users     → Plan.max_users      (POST /staff)
 *
 * Returns 403 with:
 *   { error: "plan_quota_exceeded", resource, current, max, message }
 *
 * Frontend counterpart: useSubscriptionGuard().canCreate('cards')
 */
class CheckPlanQuota
{
    public function handle(Request $request, Closure $next, string $resource): Response
    {
        $user = $request->user();

        if (! $user || ! $user->tenant) {
            return $next($request);
        }

        $tenant = $user->tenant;
        $plan = $tenant->planModel();

        if (! $plan) {
            return $next($request);
        }

        [$current, $max, $label] = match ($resource) {
            'cards' => [
                $tenant->cardTemplates()->count(),
                $plan->max_cards,
                'البطاقات',
            ],
            'locations' => [
                Location::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count(),
                $plan->max_locations,
                'المواقع',
            ],
            'users' => [
                $tenant->users()->count(),
                $plan->max_users,
                'المستخدمين',
            ],
            default => [0, PHP_INT_MAX, ''],
        };

        if ($current >= $max) {
            return response()->json([
                'error' => 'plan_quota_exceeded',
                'message' => "وصلت للحد الأقصى من {$label} ({$max}) في باقتك الحالية. قم بترقية باقتك لزيادة العدد.",
                'resource' => $resource,
                'current' => $current,
                'max' => $max,
            ], 403);
        }

        return $next($request);
    }
}
