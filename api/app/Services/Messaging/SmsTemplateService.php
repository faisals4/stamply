<?php

namespace App\Services\Messaging;

use App\Models\SmsTemplate;
use App\Models\Tenant;

class SmsTemplateService
{
    /**
     * Replace `{{var.name}}` placeholders with actual values.
     */
    public function render(string $template, array $vars): string
    {
        return preg_replace_callback(
            '/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/',
            fn ($m) => (string) ($vars[$m[1]] ?? ''),
            $template,
        );
    }

    /**
     * Load a template for the current tenant (lazy-seeding from the registry).
     */
    public function get(string $key, ?Tenant $tenant = null): SmsTemplate
    {
        $tenant ??= Tenant::first();

        $template = SmsTemplate::withoutGlobalScopes()
            ->where('tenant_id', $tenant?->id)
            ->where('key', $key)
            ->first();

        if ($template) {
            return $template;
        }

        $defaults = SmsTemplateRegistry::all()[$key] ?? null;
        if (! $defaults || ! $tenant) {
            abort(404, "Unknown SMS template key: {$key}");
        }

        return SmsTemplate::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'key' => $key,
            'name' => $defaults['name'],
            'body' => $defaults['default_body'],
            'is_enabled' => true,
        ]);
    }
}
