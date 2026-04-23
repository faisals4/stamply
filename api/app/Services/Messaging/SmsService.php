<?php

namespace App\Services\Messaging;

use App\Models\Tenant;
use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Support\Facades\Log;
use Throwable;
use Twilio\Rest\Client as TwilioClient;

/**
 * SMS sender for tenant marketing templates. Reads provider credentials
 * from the current tenant's `settings.integrations.sms` JSON blob so
 * merchants manage their own Twilio creds from the Settings UI.
 *
 * Falls back to config defaults if the tenant hasn't configured anything.
 * Logs instead of sending when disabled.
 *
 * NOTE: OTP messages use a separate platform-level provider configured
 * in `/op/settings/otp-sms` and handled directly by OtpService.
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
     * Send an SMS via Twilio (tenant marketing templates).
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

    /**
     * Alias used by PlatformSettingsController for Twilio OTP testing.
     */
    public function buildTwilioClient(array $config): TwilioClient
    {
        return $this->buildClient($config);
    }

    /**
     * Send a test SMS via SMSCountry (used by PlatformSettingsController
     * for OTP provider testing from the /op panel).
     */
    public function testSmsCountry(string $to, string $body, array $config): array
    {
        $authKey = (string) ($config['auth_key'] ?? '');
        $authToken = (string) ($config['auth_token'] ?? '');
        $senderId = (string) ($config['sender_id'] ?? 'Stamply');
        $number = ltrim($to, '+');

        $client = new GuzzleClient(['timeout' => 15]);
        $url = "https://restapi.smscountry.com/v0.1/Accounts/{$authKey}/SMSes/";

        $response = $client->post($url, [
            'auth' => [$authKey, $authToken],
            'json' => [
                'Text' => $body,
                'Number' => $number,
                'SenderId' => $senderId,
                'Tool' => 'API',
            ],
        ]);

        return json_decode($response->getBody()->getContents(), true) ?? [];
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
