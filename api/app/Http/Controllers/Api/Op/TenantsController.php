<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Http\Controllers\Controller;
use App\Models\CardTemplate;
use App\Models\Customer;
use App\Models\IssuedCard;
use App\Models\Stamp;
use App\Models\SubscriptionLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Platform-wide tenant management. Read-heavy; mutations are limited to
 * enable/disable for now. Creating new tenants happens via /signup.
 */
class TenantsController extends Controller
{
    use PaginatesResponses;

    /**
     * GET /api/op/tenants
     */
    public function index(Request $request): JsonResponse
    {
        $query = Tenant::query()
            ->withCount([
                'users',
                'cardTemplates',
            ])
            ->orderByDesc('created_at');

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('subdomain', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('is_active', $status === 'active');
        }

        $paginator = $query->paginate($this->resolvePerPage($request));
        $paginator->through(fn (Tenant $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'subdomain' => $t->subdomain,
            'plan' => $t->plan,
            'is_active' => $t->is_active,
            'trial_ends_at' => $t->trial_ends_at,
            'users_count' => $t->users_count,
            'card_templates_count' => $t->card_templates_count,
            'logo' => data_get($t->settings, 'branding.logo'),
            'created_at' => $t->created_at,
        ]);

        return $this->paginated($paginator);
    }

    /**
     * GET /api/op/tenants/{id}
     */
    public function show(string $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);
        $tid = $tenant->id;

        // Stats
        $redemptions = \App\Models\Redemption::withoutGlobalScopes()->where('tenant_id', $tid);
        $locations = \App\Models\Location::withoutGlobalScopes()->where('tenant_id', $tid);
        $pushTokens = \App\Models\PushToken::withoutGlobalScopes()->where('tenant_id', $tid);
        $messages = \App\Models\Message::withoutGlobalScopes()->where('tenant_id', $tid);

        $stats = [
            'users' => User::where('tenant_id', $tid)->count(),
            'card_templates' => CardTemplate::withoutGlobalScopes()->where('tenant_id', $tid)->count(),
            'customers' => Customer::withoutGlobalScopes()->where('tenant_id', $tid)->count(),
            'issued_cards' => IssuedCard::withoutGlobalScopes()->where('tenant_id', $tid)->count(),
            'stamps_given' => (int) Stamp::withoutGlobalScopes()->where('tenant_id', $tid)->where('count', '>', 0)->sum('count'),
            'redemptions' => (clone $redemptions)->count(),
            'locations' => (clone $locations)->count(),
            'push_tokens' => (clone $pushTokens)->count(),
            'messages_sent' => (clone $messages)->whereNotNull('sent_at')->count(),
            'active_customers' => Customer::withoutGlobalScopes()->where('tenant_id', $tid)
                ->where('last_activity_at', '>=', now()->subDays(30))->count(),
        ];

        // Users
        $users = User::where('tenant_id', $tid)
            ->select('id', 'name', 'email', 'role', 'created_at')
            ->orderByDesc('created_at')
            ->get();

        // Card templates
        $cardTemplates = CardTemplate::withoutGlobalScopes()
            ->where('tenant_id', $tid)
            ->withCount(['issuedCards' => fn ($q) => $q->withoutGlobalScopes()])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'type' => $c->type,
                'status' => $c->status,
                'stamps_count' => $c->design['stampsCount'] ?? null,
                'issued_cards_count' => $c->issued_cards_count,
                'public_slug' => $c->public_slug,
                'created_at' => $c->created_at,
            ]);

        // Locations
        $locationsList = \App\Models\Location::withoutGlobalScopes()
            ->where('tenant_id', $tid)
            ->orderBy('name')
            ->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'name' => $l->name,
                'address' => $l->address,
                'lat' => $l->lat,
                'lng' => $l->lng,
                'geofence_radius_m' => $l->geofence_radius_m,
                'is_active' => $l->is_active,
            ]);

        // Recent customers (top 10)
        $recentCustomers = Customer::withoutGlobalScopes()
            ->where('tenant_id', $tid)
            ->with('profile:id,phone,first_name,last_name,email')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => trim(($c->profile?->first_name ?? '') . ' ' . ($c->profile?->last_name ?? '')),
                'phone' => $c->profile?->phone,
                'email' => $c->profile?->email,
                'last_activity_at' => $c->last_activity_at,
                'source_utm' => $c->source_utm,
                'created_at' => $c->created_at,
            ]);

        // Subscription info
        $subscription = [
            'plan' => $tenant->plan,
            'plan_price' => $tenant->plan_price,
            'plan_interval' => $tenant->plan_interval,
            'subscription_starts_at' => $tenant->subscription_starts_at,
            'subscription_ends_at' => $tenant->subscription_ends_at,
            'subscription_notes' => $tenant->subscription_notes,
            'trial_ends_at' => $tenant->trial_ends_at,
        ];

        return response()->json([
            'data' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'plan' => $tenant->plan,
                'is_active' => $tenant->is_active,
                'trial_ends_at' => $tenant->trial_ends_at,
                'description' => data_get($tenant->settings, 'branding.description'),
                'logo' => data_get($tenant->settings, 'branding.logo'),
                'created_at' => $tenant->created_at,
                'updated_at' => $tenant->updated_at,
                'stats' => $stats,
                'subscription' => $subscription,
                'users' => $users,
                'card_templates' => $cardTemplates,
                'locations' => $locationsList,
                'recent_customers' => $recentCustomers,
            ],
        ]);
    }

    /**
     * POST /api/op/tenants
     * Manual tenant creation by the operator (no self-serve signup needed).
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'subdomain' => [
                'required',
                'string',
                'max:40',
                'regex:/^[a-z0-9-]+$/',
                'unique:tenants,subdomain',
            ],
            'admin_name' => ['required', 'string', 'max:120'],
            'admin_email' => ['required', 'email', 'max:120', 'unique:users,email'],
            'admin_password' => ['required', 'string', 'min:8', 'max:200'],
            'plan' => ['nullable', 'string', 'in:trial,basic,grow,business'],
        ]);

        [$tenant] = DB::transaction(function () use ($data) {
            $tenant = Tenant::create([
                'name' => $data['name'],
                'subdomain' => $data['subdomain'],
                'plan' => $data['plan'] ?? 'trial',
                'is_active' => true,
                'trial_ends_at' => now()->addDays(14),
                'settings' => [],
            ]);

            User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['admin_name'],
                'email' => $data['admin_email'],
                'password' => Hash::make($data['admin_password']),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]);

            // Log the trial start
            SubscriptionLog::create([
                'tenant_id' => $tenant->id,
                'action' => 'trial_started',
                'plan_from' => null,
                'plan_to' => $data['plan'] ?? 'trial',
                'starts_at' => now(),
                'ends_at' => $tenant->trial_ends_at,
                'amount' => 0,
                'payment_method' => 'cash',
                'notes' => 'إنشاء تاجر من لوحة التحكم',
                'performed_by' => $request->user()->id,
            ]);

            return [$tenant];
        });

        return response()->json(['data' => $tenant], 201);
    }

    /**
     * PATCH /api/op/tenants/{id}/toggle
     */
    public function toggle(string $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->update(['is_active' => ! $tenant->is_active]);

        return response()->json(['data' => ['is_active' => $tenant->is_active]]);
    }

    /**
     * DELETE /api/op/tenants/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        // Cascade relationships are already set up in migrations
        $tenant->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * POST /op/tenants/{id}/impersonate
     *
     * Creates a short-lived Sanctum token for the tenant's admin user,
     * allowing the platform operator to log in as the store manager.
     * The token is scoped to the `tenant` ability (same as normal login).
     */
    public function impersonate(int $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        // Find the admin user for this tenant
        $admin = User::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenant->id)
            ->where('role', 'admin')
            ->firstOrFail();

        // Create a token scoped to tenant (same as normal merchant login)
        $token = $admin->createToken('op-impersonate', ['tenant'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
                'tenant_id' => $admin->tenant_id,
                'tenant_name' => $tenant->name,
            ],
        ]);
    }
}
