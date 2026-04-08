<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Tenant staff management (الموظفون / المدراء / الكاشير).
 *
 * All endpoints are tenant-scoped — the controller manually filters by the
 * current user's tenant_id because `User` does not use the BelongsToTenant
 * global scope (User is authenticatable and scoping at that layer would break
 * Sanctum lookups).
 */
class StaffController extends Controller
{
    use PaginatesResponses;

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $query = User::with('locations:id,name')
            ->where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc');

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($role = $request->string('role')->toString()) {
            if (in_array($role, User::ROLES, true)) {
                $query->where('role', $role);
            }
        }

        $paginator = $query->paginate($this->resolvePerPage($request));
        $paginator->through(fn (User $u) => $this->transform($u));

        return $this->paginated($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $data = $this->validatePayload($request, $tenantId);

        $user = User::create([
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'], // cast 'hashed' hashes it
            'role' => $data['role'],
            'email_verified_at' => now(),
        ]);

        if (!empty($data['location_ids'])) {
            $user->locations()->sync($data['location_ids']);
        }

        return response()->json([
            'data' => $this->transform($user->fresh('locations')),
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $user = $this->findOrFailInTenant($request, $id);

        return response()->json(['data' => $this->transform($user->load('locations:id,name'))]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = $this->findOrFailInTenant($request, $id);
        $tenantId = $request->user()->tenant_id;
        $data = $this->validatePayload($request, $tenantId, updatingUserId: (int) $id);

        // Invariant: don't let the last admin be demoted.
        if (
            $user->role === 'admin'
            && $data['role'] !== 'admin'
            && $this->adminCount($tenantId) <= 1
        ) {
            throw ValidationException::withMessages([
                'role' => ['يجب أن يبقى مدير نظام واحد على الأقل'],
            ]);
        }

        // Invariant: can't demote yourself.
        if ((int) $id === $request->user()->id && $data['role'] !== $user->role) {
            throw ValidationException::withMessages([
                'role' => ['لا يمكنك تغيير دورك بنفسك'],
            ]);
        }

        $updateFields = [
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
        ];

        // Password is optional on update — only change if the admin typed one.
        if (!empty($data['password'])) {
            $updateFields['password'] = $data['password']; // 'hashed' cast handles it
        }

        $user->update($updateFields);

        $user->locations()->sync($data['location_ids'] ?? []);

        return response()->json(['data' => $this->transform($user->fresh('locations'))]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $this->findOrFailInTenant($request, $id);
        $tenantId = $request->user()->tenant_id;

        if ((int) $id === $request->user()->id) {
            throw ValidationException::withMessages([
                'id' => ['لا يمكنك حذف نفسك'],
            ]);
        }

        if ($user->role === 'admin' && $this->adminCount($tenantId) <= 1) {
            throw ValidationException::withMessages([
                'id' => ['يجب أن يبقى مدير نظام واحد على الأقل'],
            ]);
        }

        $user->delete();

        return response()->json(['ok' => true]);
    }

    /* ─── helpers ────────────────────────────────────────────── */

    private function findOrFailInTenant(Request $request, string $id): User
    {
        return User::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);
    }

    private function adminCount(int $tenantId): int
    {
        return User::where('tenant_id', $tenantId)->where('role', 'admin')->count();
    }

    private function validatePayload(Request $request, int $tenantId, ?int $updatingUserId = null): array
    {
        $isCreate = $updatingUserId === null;

        $rules = [
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'email:rfc',
                'max:180',
                Rule::unique('users', 'email')->ignore($updatingUserId),
            ],
            'role' => ['required', Rule::in(User::ROLES)],
            'location_ids' => ['nullable', 'array'],
            'location_ids.*' => [
                'integer',
                // Only allow locations that belong to the current tenant.
                Rule::exists('locations', 'id')->where('tenant_id', $tenantId),
            ],
        ];

        if ($isCreate) {
            $rules['password'] = ['required', 'string', 'min:8', 'max:180'];
        } else {
            // Optional on update: only validated if the admin actually typed a new one.
            $rules['password'] = ['nullable', 'string', 'min:8', 'max:180'];
        }

        $data = $request->validate($rules);

        // Cashier must be scoped to at least one location.
        if ($data['role'] === 'cashier' && empty($data['location_ids'] ?? [])) {
            throw ValidationException::withMessages([
                'location_ids' => ['يجب ربط الكاشير بفرع واحد على الأقل'],
            ]);
        }

        return $data;
    }

    private function transform(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'locations' => $user->relationLoaded('locations')
                ? $user->locations->map(fn ($l) => ['id' => $l->id, 'name' => $l->name])->values()
                : [],
            'created_at' => $user->created_at?->toIso8601String(),
            'is_self' => $user->id === auth()->id(),
        ];
    }
}
