<?php

namespace App\Services\Messaging;

use App\Models\EmailTemplate;
use App\Models\Tenant;

class TemplateService
{
    /**
     * Replace `{{var.name}}` placeholders with actual values.
     * Missing vars are replaced with an empty string.
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
     * Load a template for the current tenant (falling back to the registry
     * defaults if not seeded yet).
     */
    public function get(string $key, ?Tenant $tenant = null): EmailTemplate
    {
        $tenant ??= Tenant::first();

        $template = EmailTemplate::withoutGlobalScopes()
            ->where('tenant_id', $tenant?->id)
            ->where('key', $key)
            ->first();

        if ($template) {
            return $template;
        }

        // Lazy-seed from the registry defaults
        $defaults = TemplateRegistry::all()[$key] ?? null;
        if (! $defaults || ! $tenant) {
            abort(404, "Unknown template key: {$key}");
        }

        return EmailTemplate::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'key' => $key,
            'name' => $defaults['name'],
            'subject' => $defaults['default_subject'],
            'html' => $defaults['default_html'],
            'is_enabled' => true,
        ]);
    }
}
