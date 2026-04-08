<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Http\Controllers\Controller;
use App\Models\CardTemplate;
use App\Models\Customer;
use App\Models\IssuedCard;
use App\Models\Stamp;
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

        $stats = [
            'users' => User::where('tenant_id', $tenant->id)->count(),
            'card_templates' => CardTemplate::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->count(),
            'customers' => Customer::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->count(),
            'issued_cards' => IssuedCard::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->count(),
            'stamps_given' => Stamp::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('count', '>', 0)
                ->sum('count'),
        ];

        $users = User::where('tenant_id', $tenant->id)
            ->select('id', 'name', 'email', 'role', 'created_at')
            ->get();

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
                'stats' => $stats,
                'users' => $users,
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
}
