<?php

namespace App\Http\Controllers\Api\App;

use App\Http\Controllers\Controller;
use App\Models\CustomerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Profile endpoints for the authenticated mobile customer.
 *
 * Since the profile refactor, `$request->user()` returns a
 * `CustomerProfile` directly — the Sanctum token is now issued
 * against the central profile model, not a per-tenant Customer row.
 * Reads and writes hit a single row; no transaction or cross-tenant
 * fan-out is required because personal data already lives in one
 * place.
 *
 * # Locking
 *
 * When the customer updates any field here, that field's name is
 * added to the profile's `locked_fields` JSON array. Merchants can
 * no longer edit locked fields through their admin panel — they
 * receive an HTTP 423 with the list of locked fields. Unlock happens
 * either by the customer clearing the field (setting it to null) or
 * by a platform admin through `/api/op/customers/unlock`.
 */
class CustomerProfileController extends Controller
{
    /**
     * Fields that can be locked by the customer. The request
     * validator must accept exactly this set — nothing else ever
     * lands in `locked_fields`.
     */
    private const LOCKABLE_FIELDS = [
        'first_name',
        'last_name',
        'email',
        'birthdate',
        'gender',
    ];

    /**
     * GET /api/app/me
     * Returns the profile + a live count of the merchants this
     * customer has a relationship with.
     */
    public function show(Request $request): JsonResponse
    {
        /** @var CustomerProfile $profile */
        $profile = $request->user();

        // Reload so we always reflect the latest DB state, even
        // within a single request that just updated the row.
        $profile->refresh();

        return response()->json([
            'data' => $this->presentProfile($profile),
        ]);
    }

    /**
     * PUT /api/app/me
     * Body: { first_name?, last_name?, email?, birthdate?, gender? }
     *
     * Updates the central profile row. Any field the customer
     * touches (non-null, non-empty-string value) becomes locked;
     * any field they deliberately clear (empty string → null) is
     * unlocked so merchants can edit it again.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'in:male,female'],
        ]);

        /** @var CustomerProfile $profile */
        $profile = $request->user();

        $currentLocks = $profile->locked_fields ?? [];
        $newLocks = $currentLocks;
        $patch = [];

        // Only touch fields the client actually sent (i.e. fields
        // that exist as keys in the validated payload). Null sent
        // explicitly = "clear this field and unlock it". Not sent
        // at all = "leave untouched".
        foreach (self::LOCKABLE_FIELDS as $field) {
            if (! array_key_exists($field, $data)) {
                continue;
            }
            $value = $data[$field];
            if ($value === null || $value === '') {
                // Clear + unlock
                $patch[$field] = null;
                $newLocks = array_values(array_diff($newLocks, [$field]));
            } else {
                // Set + lock
                $patch[$field] = $value;
                if (! in_array($field, $newLocks, true)) {
                    $newLocks[] = $field;
                }
            }
        }

        if (empty($patch) && $newLocks === $currentLocks) {
            // No-op request — just return the current state.
            return $this->show($request);
        }

        $profile->update(array_merge($patch, [
            'locked_fields' => $newLocks,
        ]));

        return $this->show($request);
    }

    private function presentProfile(CustomerProfile $profile): array
    {
        return [
            'id' => $profile->id,
            'phone' => $profile->phone,
            'first_name' => $profile->first_name,
            'last_name' => $profile->last_name,
            'email' => $profile->email,
            'birthdate' => $profile->birthdate?->toDateString(),
            'gender' => $profile->gender,
            'phone_verified_at' => $profile->phone_verified_at?->toIso8601String(),
            'locked_fields' => $profile->locked_fields ?? [],
            // How many merchants this customer has signed up with.
            // Computed live so the mobile "welcome back at N stores"
            // caption is always accurate.
            //
            // `withoutGlobalScopes(['tenant'])` is mandatory here
            // because `$profile->customers()` inherits the Customer
            // model's `BelongsToTenant` scope, and the authenticated
            // user in this request is the CustomerProfile (no
            // tenant_id attribute) — so the scope would silently
            // filter every row out.
            'tenants_count' => $profile->customers()
                ->withoutGlobalScopes(['tenant'])
                ->count(),
        ];
    }
}
