<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Tenant role permission management.
 *
 * Permissions are persisted on tenant.settings['role_permissions'][$role]
 * as an array of allowed catalog keys. When a tenant hasn't customised a
 * role yet, defaults come from PermissionCatalog::defaultsFor().
 *
 * NOTE: these values are metadata only for now — enforcement at the route
 * layer is deferred to a later iteration.
 */
class PermissionsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $settings = $tenant->settings ?? [];
        $stored = $settings['role_permissions'] ?? [];

        $roles = [];
        foreach (PermissionCatalog::ROLES as $role) {
            $roles[$role] = $stored[$role] ?? PermissionCatalog::defaultsFor($role);
        }

        return response()->json([
            'data' => [
                'catalog' => PermissionCatalog::groups(),
                'roles' => $roles,
            ],
        ]);
    }

    public function update(Request $request, string $role): JsonResponse
    {
        if (!in_array($role, PermissionCatalog::ROLES, true)) {
            abort(404);
        }

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::in(PermissionCatalog::allKeys())],
        ]);

        $tenant = $request->user()->tenant;
        $settings = $tenant->settings ?? [];
        $settings['role_permissions'] = $settings['role_permissions'] ?? [];
        $settings['role_permissions'][$role] = array_values(array_unique($data['permissions']));

        $tenant->update(['settings' => $settings]);

        return response()->json([
            'data' => [
                'role' => $role,
                'permissions' => $settings['role_permissions'][$role],
            ],
        ]);
    }
}
