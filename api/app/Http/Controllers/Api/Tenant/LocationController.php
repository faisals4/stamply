<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\PaginatesResponses;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    use PaginatesResponses;

    public function index(Request $request): JsonResponse
    {
        $query = Location::orderBy('name');

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($this->resolvePerPage($request));

        return $this->paginated($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateLocation($request);
        $location = Location::create($data);

        return response()->json(['data' => $location], 201);
    }

    public function show(string $id): JsonResponse
    {
        $location = Location::findOrFail($id);

        return response()->json(['data' => $location]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $location = Location::findOrFail($id);
        $data = $this->validateLocation($request);
        $location->update($data);

        return response()->json(['data' => $location->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        Location::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }

    private function validateLocation(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'geofence_radius_m' => ['nullable', 'integer', 'min:10', 'max:10000'],
            'message' => ['nullable', 'string', 'max:160'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
