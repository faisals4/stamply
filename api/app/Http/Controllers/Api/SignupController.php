<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Public self-serve signup for new merchants. Creates a fresh Tenant + an
 * admin User, then returns a Sanctum token so the browser can log the user
 * into /admin immediately.
 */
class SignupController extends Controller
{
    /**
     * POST /api/signup
     * Body:
     *   - brand_name:  اسم النشاط  (required)
     *   - subdomain:   المُعرِّف   (required, unique, [a-z0-9-])
     *   - name:        اسم المستخدم  (required)
     *   - email:       البريد        (required, unique)
     *   - password:    كلمة المرور   (required, min 8)
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'brand_name' => ['required', 'string', 'max:120'],
            'subdomain' => [
                'required',
                'string',
                'max:40',
                'regex:/^[a-z0-9-]+$/',
                'unique:tenants,subdomain',
            ],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:120', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:200'],
        ]);

        [$tenant, $user] = DB::transaction(function () use ($data) {
            $tenant = Tenant::create([
                'name' => $data['brand_name'],
                'subdomain' => $data['subdomain'],
                'plan' => 'trial',
                'is_active' => true,
                'trial_ends_at' => now()->addDays(14),
                'settings' => [],
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]);

            return [$tenant, $user];
        });

        // Issue a Sanctum token scoped to `tenant` so it can't touch /op routes.
        $token = $user->createToken('spa', ['tenant'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'tenant_id' => $user->tenant_id,
            ],
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'plan' => $tenant->plan,
                'trial_ends_at' => $tenant->trial_ends_at,
            ],
        ], 201);
    }
}
