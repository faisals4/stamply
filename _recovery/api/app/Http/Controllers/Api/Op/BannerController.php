<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = Banner::orderBy('sort_order')->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $banners->map(fn (Banner $b) => $this->toArray($b)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'image' => ['required', 'image', 'max:5120'], // 5MB
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $path = $request->file('image')->store('banners', 'public');

        $banner = Banner::create([
            'title' => $data['title'],
            'image_path' => $path,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $this->toArray($banner)], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:100'],
            'image' => ['sometimes', 'image', 'max:5120'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($request->hasFile('image')) {
            // Delete old image
            if ($banner->image_path) {
                Storage::disk('public')->delete($banner->image_path);
            }
            $data['image_path'] = $request->file('image')->store('banners', 'public');
        }

        unset($data['image']);
        $banner->update($data);

        return response()->json(['data' => $this->toArray($banner->fresh())]);
    }

    public function destroy(string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        if ($banner->image_path) {
            Storage::disk('public')->delete($banner->image_path);
        }

        $banner->delete();

        return response()->json(['ok' => true]);
    }

    public function toggle(string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);
        $banner->update(['is_active' => ! $banner->is_active]);

        return response()->json(['data' => $this->toArray($banner->fresh())]);
    }

    /**
     * Public endpoint — returns only active banners for the mobile app.
     */
    public function publicIndex(): JsonResponse
    {
        $banners = Banner::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'title', 'image_path']);

        return response()->json([
            'data' => $banners->map(fn (Banner $b) => [
                'id' => $b->id,
                'title' => $b->title,
                'image_url' => $b->image_path ? url('storage/' . $b->image_path) : null,
            ]),
        ]);
    }

    private function toArray(Banner $b): array
    {
        return [
            'id' => $b->id,
            'title' => $b->title,
            'image_url' => $b->image_path ? url('storage/' . $b->image_path) : null,
            'image_path' => $b->image_path,
            'sort_order' => $b->sort_order,
            'is_active' => $b->is_active,
            'created_at' => $b->created_at,
        ];
    }
}
