<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Self-service profile management for the *currently authenticated* user.
 *
 * Intentionally NOT gated by the `can.perm` middleware — every signed-in
 * user (admin / manager / cashier) is allowed to manage their own profile.
 */
class ProfileController extends Controller
{
    /** GET /api/profile */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'permissions' => $user->permissions(),
            ],
        ]);
    }

    /** PUT /api/profile — update name + email. */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'email:rfc',
                'max:180',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        $user->update($data);

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'permissions' => $user->permissions(),
            ],
        ]);
    }

    /** PUT /api/profile/password — change password (verifies current). */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:180', 'confirmed'],
        ]);

        if (!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['كلمة المرور الحالية غير صحيحة'],
            ]);
        }

        $user->update(['password' => $data['new_password']]); // 'hashed' cast

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/profile/logout-all — revoke every Sanctum token belonging
     * to this user EXCEPT the current one (so the caller stays signed in).
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentId = $request->user()->currentAccessToken()->id;

        $deleted = $user->tokens()->where('id', '!=', $currentId)->delete();

        return response()->json([
            'ok' => true,
            'revoked' => $deleted,
        ]);
    }
}
