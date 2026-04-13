<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Manage subscription plans from /op.
 */
class PlansController extends Controller
{
    /**
     * GET /api/op/plans
     */
    public function index(): JsonResponse
    {
        $plans = Plan::orderBy('sort_order')->get();

        return response()->json(['data' => $plans]);
    }

    /**
     * PUT /api/op/plans/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $plan = Plan::findOrFail($id);

        $data = $request->validate([
            'name_ar' => ['sometimes', 'string', 'max:120'],
            'name_en' => ['sometimes', 'string', 'max:120'],
            'monthly_price' => ['sometimes', 'numeric', 'min:0'],
            'yearly_price' => ['sometimes', 'numeric', 'min:0'],
            'max_cards' => ['sometimes', 'integer', 'min:1'],
            'max_locations' => ['sometimes', 'integer', 'min:1'],
            'max_users' => ['sometimes', 'integer', 'min:1'],
            'trial_days' => ['sometimes', 'integer', 'min:0'],
            'features' => ['sometimes', 'nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $plan->update($data);

        return response()->json(['data' => $plan->fresh()]);
    }
}
