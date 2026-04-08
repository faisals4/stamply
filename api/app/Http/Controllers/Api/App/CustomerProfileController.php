<?php

namespace App\Http\Controllers\Api\App;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Profile endpoints for the authenticated mobile customer.
 *
 * WRITES fan out across every Customer row with this phone so the
 * merchant dashboards stay in sync — if the customer updates their
 * first name in the app, every merchant they've ever signed up with
 * sees the new name. That's the "one real person, many tenant rows"
 * design taken to its logical conclusion.
 *
 * Always uses `withoutGlobalScopes()` because `BelongsToTenant` would
 * otherwise filter the query to just the canonical token owner's
 * tenant.
 */
class CustomerProfileController extends Controller
{
    /**
     * GET /api/app/me
     * Returns the canonical profile for this phone, with a tenant
     * count so the client can show "you're a customer at N merchants".
     */
    public function show(Request $request): JsonResponse
    {
        $phone = $request->user()->phone;

        $customers = Customer::withoutGlobalScopes()
            ->where('phone', $phone)
            ->get();

        $canonical = $customers->first();

        return response()->json([
            'data' => [
                'id' => $canonical->id,
                'phone' => $canonical->phone,
                'first_name' => $canonical->first_name,
                'last_name' => $canonical->last_name,
                'email' => $canonical->email,
                'locale' => $canonical->locale,
                'phone_verified_at' => $canonical->phone_verified_at?->toIso8601String(),
                'tenants_count' => $customers->count(),
            ],
        ]);
    }

    /**
     * PUT /api/app/me
     * Body: { first_name?, last_name?, email?, locale? }
     *
     * Wrapped in a transaction so a partial failure doesn't leave
     * tenant rows in inconsistent states.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'locale' => ['nullable', 'string', 'in:ar,en'],
        ]);

        // Drop null values so we don't blank out fields the client
        // didn't touch.
        $patch = array_filter($data, fn ($v) => $v !== null);

        if (empty($patch)) {
            return $this->show($request);
        }

        $phone = $request->user()->phone;

        DB::transaction(function () use ($phone, $patch) {
            Customer::withoutGlobalScopes()
                ->where('phone', $phone)
                ->update($patch);
        });

        return $this->show($request);
    }
}
