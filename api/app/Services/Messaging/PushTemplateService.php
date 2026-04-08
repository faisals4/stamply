<?php

namespace App\Services\Messaging;

use App\Models\PushTemplate;
use App\Models\Tenant;

/**
 * Thin accessor for push templates with lazy seeding from the registry —
 * mirrors SmsTemplateService so the three channels share identical APIs.
 */
class PushTemplateService
{
    /**
     * Replace `{{var.name}}` placeholders with actual values. Same
     * rendering semantics as the SMS/email template services.
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
     * Load a template for the current tenant, creating it from the
     * registry defaults on first access.
     */
    public function get(string $key, ?Tenant $tenant = null): PushTemplate
    {
        $tenant ??= Tenant::first();

        $template = PushTemplate::withoutGlobalScopes()
            ->where('tenant_id', $tenant?->id)
            ->where('key', $key)
            ->first();

        if ($template) {
            return $template;
        }

        $defaults = PushTemplateRegistry::all()[$key] ?? null;
        if (! $defaults || ! $tenant) {
            abort(404, "Unknown push template key: {$key}");
        }

        return PushTemplate::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'key' => $key,
            'name' => $defaults['name'],
            'title' => $defaults['default_title'],
            'body' => $defaults['default_body'],
            'url' => $defaults['default_url'] ?: null,
            'is_enabled' => true,
        ]);
    }
}
