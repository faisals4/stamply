<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Current merchant (tenant) profile — shown and edited on the Settings page.
 * Drives the "brand" info that appears on public registration pages, emails,
 * SMS, and wallet passes.
 */
class TenantController extends Controller
{
    /**
     * GET /api/tenant
     */
    public function show(): JsonResponse
    {
        $tenant = $this->current();
        if (! $tenant) {
            abort(404);
        }

        return response()->json(['data' => $this->serialize($tenant)]);
    }

    /**
     * PUT /api/tenant
     * Editable merchant fields: name, subdomain, branding.description, branding.logo (base64).
     */
    public function update(Request $request): JsonResponse
    {
        $tenant = $this->current();
        if (! $tenant) {
            abort(404);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'subdomain' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9-]+$/'],
            'description' => ['nullable', 'string', 'max:280'],
            'logo' => ['nullable', 'string', 'max:2000000'], // base64 data URL, ~1.5MB after base64 overhead
        ]);

        // Subdomain must be unique
        if ($data['subdomain'] !== $tenant->subdomain) {
            $exists = Tenant::where('subdomain', $data['subdomain'])
                ->where('id', '!=', $tenant->id)
                ->exists();
            if ($exists) {
                abort(422, 'هذا المُعرِّف مستخدم من قِبَل حساب آخر');
            }
            $tenant->subdomain = $data['subdomain'];
        }

        $tenant->name = $data['name'];

        // Merge branding into the existing settings JSON
        $settings = $tenant->settings ?? [];
        $branding = $settings['branding'] ?? [];
        if (array_key_exists('description', $data)) {
            $branding['description'] = $data['description'];
        }
        if (array_key_exists('logo', $data) && $data['logo'] !== null) {
            $branding['logo'] = $data['logo'];
        }
        $settings['branding'] = $branding;
        $tenant->settings = $settings;

        $tenant->save();

        return response()->json(['data' => $this->serialize($tenant->fresh())]);
    }

    private function current(): ?Tenant
    {
        $userTenantId = auth()->user()?->tenant_id;
        if ($userTenantId) {
            return Tenant::find($userTenantId);
        }

        return Tenant::first();
    }

    private function serialize(Tenant $tenant): array
    {
        $branding = data_get($tenant->settings, 'branding', []);

        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'subdomain' => $tenant->subdomain,
            'plan' => $tenant->plan,
            'is_active' => $tenant->is_active,
            'description' => $branding['description'] ?? null,
            'logo' => $branding['logo'] ?? null,
            'created_at' => $tenant->created_at,
        ];
    }

    /**
     * GET /api/public/tenant/{id}/logo
     * No auth — Google Wallet's servers fetch this URL when displaying
     * the loyaltyClass programLogo. Apple Wallet doesn't use it (the
     * pkpass embeds the PNG bytes directly), only Google needs an
     * over-the-wire fetch.
     *
     * The brand logo is stored as a base64 data URL inside
     * `tenant.settings.branding.logo`. We decode it on the fly and
     * stream the bytes back with the correct Content-Type.
     */
    public function publicLogo(int $id): Response
    {
        $tenant = Tenant::find($id);
        if (! $tenant) {
            abort(404);
        }

        $dataUrl = data_get($tenant->settings, 'branding.logo');
        if (! is_string($dataUrl) || ! str_starts_with($dataUrl, 'data:')) {
            abort(404);
        }

        // Parse data URL: data:image/png;base64,XXXX
        if (! preg_match('#^data:([^;]+);base64,(.+)$#', $dataUrl, $m)) {
            abort(415);
        }

        $contentType = $m[1] ?: 'image/png';
        $bytes = base64_decode($m[2], true);
        if ($bytes === false) {
            abort(500);
        }

        return response($bytes, 200, [
            'Content-Type' => $contentType,
            // Google's image fetcher caches aggressively — give it
            // an etag based on the content so cache invalidation
            // happens automatically when the tenant uploads a new
            // logo.
            'ETag' => '"'.sha1($bytes).'"',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
