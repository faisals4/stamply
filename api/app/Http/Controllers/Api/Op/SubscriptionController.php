<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\SubscriptionLog;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Platform-wide subscription management. All mutations are logged in
 * subscription_logs so every change is auditable.
 */
class SubscriptionController extends Controller
{
    use PaginatesResponses;

    /**
     * GET /api/op/subscriptions
     * List all tenants with subscription info.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Tenant::query()->orderByDesc('created_at');

        // Search by name or subdomain
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('subdomain', 'like', "%{$search}%");
            });
        }

        // Filter by plan
        if ($plan = $request->query('plan')) {
            $query->where('plan', $plan);
        }

        // Filter by status: active, expired, trial
        if ($status = $request->query('status')) {
            match ($status) {
                'active' => $query->where('plan', '!=', 'trial')
                    ->where('subscription_ends_at', '>', now()),
                'expired' => $query->where(function ($q) {
                    $q->where(function ($q2) {
                        $q2->where('plan', 'trial')
                            ->where(function ($q3) {
                                $q3->whereNull('trial_ends_at')
                                    ->orWhere('trial_ends_at', '<', now());
                            });
                    })->orWhere(function ($q2) {
                        $q2->where('plan', '!=', 'trial')
                            ->where(function ($q3) {
                                $q3->whereNull('subscription_ends_at')
                                    ->orWhere('subscription_ends_at', '<', now());
                            });
                    });
                }),
                'trial' => $query->where('plan', 'trial')
                    ->where('trial_ends_at', '>', now()),
                default => null,
            };
        }

        $paginator = $query->paginate($this->resolvePerPage($request));
        $plans = Plan::all()->keyBy('slug');

        $paginator->through(fn (Tenant $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'subdomain' => $t->subdomain,
            'plan' => $t->plan,
            'plan_name_ar' => $plans[$t->plan]?->name_ar ?? $t->plan,
            'is_active' => $t->is_active,
            'subscription_status' => $t->subscriptionStatus(),
            'trial_ends_at' => $t->trial_ends_at,
            'subscription_starts_at' => $t->subscription_starts_at,
            'subscription_ends_at' => $t->subscription_ends_at,
            'plan_price' => $t->plan_price,
            'plan_interval' => $t->plan_interval,
            'days_remaining' => $t->daysRemaining(),
            'created_at' => $t->created_at,
        ]);

        return $this->paginated($paginator);
    }

    /**
     * GET /api/op/subscriptions/{tenantId}
     * Detailed subscription info for a single tenant.
     */
    public function show(string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);
        $plan = $tenant->planModel();

        // Usage stats
        $cardsUsed = $tenant->cardTemplates()->count();
        $locationsUsed = \App\Models\Location::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)->count();
        $usersCount = $tenant->users()->count();

        return response()->json([
            'data' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'plan' => $tenant->plan,
                'plan_name_ar' => $plan?->name_ar ?? $tenant->plan,
                'plan_name_en' => $plan?->name_en ?? $tenant->plan,
                'is_active' => $tenant->is_active,
                'subscription_status' => $tenant->subscriptionStatus(),
                'trial_ends_at' => $tenant->trial_ends_at,
                'subscription_starts_at' => $tenant->subscription_starts_at,
                'subscription_ends_at' => $tenant->subscription_ends_at,
                'plan_price' => $tenant->plan_price,
                'plan_interval' => $tenant->plan_interval,
                'subscription_notes' => $tenant->subscription_notes,
                'days_remaining' => $tenant->daysRemaining(),
                'created_at' => $tenant->created_at,
                'plan_details' => $plan ? [
                    'monthly_price' => $plan->monthly_price,
                    'yearly_price' => $plan->yearly_price,
                    'max_cards' => $plan->max_cards,
                    'max_locations' => $plan->max_locations,
                    'max_users' => $plan->max_users,
                    'features' => $plan->features,
                ] : null,
                'usage' => [
                    'cards' => $cardsUsed,
                    'locations' => $locationsUsed,
                    'users' => $usersCount,
                ],
            ],
        ]);
    }

    /**
     * PUT /api/op/subscriptions/{tenantId}
     * Update subscription: change plan, activate/deactivate, set dates, etc.
     */
    public function update(Request $request, string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);

        $data = $request->validate([
            'plan' => ['sometimes', 'string', 'exists:plans,slug'],
            'plan_interval' => ['sometimes', 'string', 'in:monthly,yearly'],
            'subscription_starts_at' => ['sometimes', 'nullable', 'date'],
            'subscription_ends_at' => ['sometimes', 'nullable', 'date'],
            'plan_price' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'subscription_notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'payment_method' => ['sometimes', 'string', 'in:cash,bank_transfer,card'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $oldPlan = $tenant->plan;
        $newPlan = $data['plan'] ?? $oldPlan;

        // Determine action type for the log
        $action = 'updated';
        if (isset($data['plan']) && $data['plan'] !== $oldPlan) {
            $planOrder = ['trial' => 0, 'basic' => 1, 'growth' => 2, 'business' => 3];
            $oldOrder = $planOrder[$oldPlan] ?? 0;
            $newOrder = $planOrder[$newPlan] ?? 0;
            $action = $newOrder > $oldOrder ? 'upgraded' : 'downgraded';
        }

        // If switching from trial to paid, clear trial and set subscription dates
        if ($oldPlan === 'trial' && $newPlan !== 'trial') {
            $data['subscription_starts_at'] = $data['subscription_starts_at'] ?? now();

            $interval = $data['plan_interval'] ?? 'monthly';
            if (! isset($data['subscription_ends_at'])) {
                $data['subscription_ends_at'] = $interval === 'yearly'
                    ? now()->addYear()
                    : now()->addMonth();
            }

            // Set price from plan if not specified
            if (! isset($data['plan_price'])) {
                $plan = Plan::where('slug', $newPlan)->first();
                $data['plan_price'] = $interval === 'yearly'
                    ? $plan->yearly_price
                    : $plan->monthly_price;
            }
        }

        $tenant->update(collect($data)->except(['payment_method', 'notes'])->toArray());

        // Log the change
        SubscriptionLog::create([
            'tenant_id' => $tenant->id,
            'action' => $action,
            'plan_from' => $oldPlan,
            'plan_to' => $newPlan,
            'starts_at' => $tenant->subscription_starts_at,
            'ends_at' => $tenant->subscription_ends_at ?? $tenant->trial_ends_at,
            'amount' => $tenant->plan_price ?? 0,
            'payment_method' => $data['payment_method'] ?? 'cash',
            'notes' => $data['notes'] ?? $data['subscription_notes'] ?? null,
            'performed_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $tenant->fresh()]);
    }

    /**
     * POST /api/op/subscriptions/{tenantId}/extend
     * Extend subscription by a given duration.
     */
    public function extend(Request $request, string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);

        $data = $request->validate([
            'months' => ['required_without:days', 'integer', 'min:1', 'max:24'],
            'days' => ['required_without:months', 'integer', 'min:1', 'max:365'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'payment_method' => ['sometimes', 'string', 'in:cash,bank_transfer,card'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $currentEnd = $tenant->isTrial()
            ? ($tenant->trial_ends_at ?? now())
            : ($tenant->subscription_ends_at ?? now());

        // If already expired, extend from now, not from the expired date
        $base = $currentEnd->lt(now()) ? now() : $currentEnd;

        if (isset($data['months'])) {
            $newEnd = $base->copy()->addMonths($data['months']);
        } else {
            $newEnd = $base->copy()->addDays($data['days']);
        }

        if ($tenant->isTrial()) {
            $tenant->update(['trial_ends_at' => $newEnd]);
        } else {
            $tenant->update(['subscription_ends_at' => $newEnd]);
        }

        SubscriptionLog::create([
            'tenant_id' => $tenant->id,
            'action' => 'extended',
            'plan_from' => $tenant->plan,
            'plan_to' => $tenant->plan,
            'starts_at' => $currentEnd,
            'ends_at' => $newEnd,
            'amount' => $data['amount'] ?? 0,
            'payment_method' => $data['payment_method'] ?? 'cash',
            'notes' => $data['notes'] ?? null,
            'performed_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => [
                'subscription_ends_at' => $newEnd->toIso8601String(),
                'days_remaining' => $tenant->fresh()->daysRemaining(),
            ],
        ]);
    }

    /**
     * GET /api/op/subscriptions/{tenantId}/logs
     * Subscription change log for a tenant.
     */
    public function logs(Request $request, string $tenantId): JsonResponse
    {
        Tenant::findOrFail($tenantId); // ensure tenant exists

        $logs = SubscriptionLog::where('tenant_id', $tenantId)
            ->with('performer:id,name')
            ->orderByDesc('created_at')
            ->paginate($this->resolvePerPage($request));

        return $this->paginated($logs);
    }

    /**
     * DELETE /api/op/subscriptions/{tenantId}/logs/{logId}
     * Delete a subscription log entry and reverse the extension if applicable.
     */
    public function deleteLog(Request $request, string $tenantId, string $logId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);
        $log = SubscriptionLog::where('tenant_id', $tenantId)->findOrFail($logId);

        // If this was an extension, reverse it by subtracting the days that were added
        if ($log->action === 'extended' && $log->starts_at && $log->ends_at) {
            $daysExtended = $log->starts_at->diffInDays($log->ends_at);

            // Determine which date field to adjust
            $field = $tenant->subscription_ends_at ? 'subscription_ends_at' : 'trial_ends_at';
            $currentEnd = $tenant->{$field};

            if ($currentEnd) {
                $newEnd = $currentEnd->subDays($daysExtended);
                $tenant->{$field} = $newEnd;
                $tenant->save();
            }
        }

        $log->delete();

        return response()->json(['ok' => true]);
    }
}
