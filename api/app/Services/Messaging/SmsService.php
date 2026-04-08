<?php

namespace App\Services\Messaging;

use App\Models\Tenant;
use Illuminate\Support\Facades\Log;
use Throwable;
use Twilio\Rest\Client as TwilioClient;

/**
 * SMS sender. Reads provider credentials from the current tenant's
 * `settings.integrations.sms` JSON blob so merchants manage their own
 * Twilio (or future provider) creds from the Settings UI.
 *
 * Falls back to config defaults if the tenant hasn't configured anything.
 * Logs instead of sending when disabled.
 */
class SmsService
{
    public function getConfig(?Tenant $tenant = null): array
    {
        $tenant ??= $this->resolveTenant();
        $tenantSms = data_get($tenant?->settings, 'integrations.sms', []);

        return [
            'enabled' => $tenantSms['enabled'] ?? config('messaging.sms.enabled', false),
            'provider' => $tenantSms['provider'] ?? 'Twilio',
            'account_sid' => $tenantSms['account_sid'] ?? config('messaging.sms.twilio.sid'),
            'auth_token' => $tenantSms['auth_token'] ?? config('messaging.sms.twilio.token'),
            'from_number' => $tenantSms['from_number'] ?? config('messaging.sms.twilio.from'),
        ];
    }

    /**
     * Safe-to-expose version: auth_token is masked.
     */
    public function getConfigMasked(?Tenant $tenant = null): array
    {
        $c = $this->getConfig($tenant);
        $token = $c['auth_token'] ?? '';
        $c['auth_token'] = $token
            ? str_repeat('•', 4).substr($token, -4)
            : '';
        $c['has_auth_token'] = (bool) $token;

        return $c;
    }

    public function updateConfig(array $patch, ?Tenant $tenant = null): void
    {
        $tenant ??= $this->resolveTenant();
        if (! $tenant) {
            return;
        }

        $current = data_get($tenant->settings, 'integrations.sms', []);

        foreach ($patch as $key => $value) {
            if ($value !== null && $value !== '') {
                $current[$key] = $value;
            }
        }

        $settings = $tenant->settings ?? [];
        $settings['integrations']['sms'] = $current;
        $tenant->settings = $settings;
        $tenant->save();
    }

    /**
     * Send an SMS via Twilio.
     *
     * @param  string  $to      E.164 phone number, e.g. "+966555000001"
     * @param  string  $body    Message body. Keep under 160 chars for single-segment SMS.
     * @param  Tenant|null  $tenant  Explicit tenant context. Required when
     *                               sending outside an authenticated request
     *                               (e.g. the public OTP flow) — otherwise
     *                               `resolveTenant()` falls back to `auth()`
     *                               and lands on the global defaults.
     */
    public function send(string $to, string $body, ?Tenant $tenant = null): bool
    {
        $config = $this->getConfig($tenant);

        if (! ($config['enabled'] ?? false)) {
            Log::info("[SMS-STUB] to={$to} body={$body}");

            return true;
        }

        try {
            $client = $this->buildClient($config);
            $client->messages->create($to, [
                'from' => $config['from_number'],
                'body' => $body,
            ]);

            return true;
        } catch (Throwable $e) {
            Log::error('SmsService::send failed', [
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Build a Twilio client from an arbitrary config (used by the test
     * endpoint so the user can test unsaved credentials).
     */
    public function buildClient(array $config): TwilioClient
    {
        $sid = (string) ($config['account_sid'] ?? '');
        $token = (string) ($config['auth_token'] ?? '');

        return new TwilioClient($sid, $token);
    }

    private function resolveTenant(): ?Tenant
    {
        $user = auth()->user();
        if ($user && $user->tenant_id) {
            return Tenant::find($user->tenant_id);
        }

        return Tenant::first();
    }
}
