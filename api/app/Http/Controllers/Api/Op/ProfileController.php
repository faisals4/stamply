<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Self-service profile management for the currently authenticated platform
 * admin. Mirrors the tenant ProfileController, but operates on the
 * `platform_admins` table instead of `users`.
 */
class ProfileController extends Controller
{
    /** GET /api/op/profile */
    public function show(Request $request): JsonResponse
    {
        $admin = $request->user();

        return response()->json([
            'data' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
            ],
        ]);
    }

    /** PUT /api/op/profile — update name + email. */
    public function update(Request $request): JsonResponse
    {
        $admin = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'email:rfc',
                'max:180',
                Rule::unique('platform_admins', 'email')->ignore($admin->id),
            ],
        ]);

        $admin->update($data);

        return response()->json([
            'data' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
            ],
        ]);
    }

    /** PUT /api/op/profile/password — change password. */
    public function updatePassword(Request $request): JsonResponse
    {
        $admin = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:180', 'confirmed'],
        ]);

        if (!Hash::check($data['current_password'], $admin->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['كلمة المرور الحالية غير صحيحة'],
            ]);
        }

        $admin->update(['password' => Hash::make($data['new_password'])]);

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/op/profile/logout-all — revoke every other Sanctum token
     * belonging to this platform admin (keeps the current one alive).
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $admin = $request->user();
        $currentId = $request->user()->currentAccessToken()->id;

        $deleted = $admin->tokens()->where('id', '!=', $currentId)->delete();

        return response()->json([
            'ok' => true,
            'revoked' => $deleted,
        ]);
    }
}
