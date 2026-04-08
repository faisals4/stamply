<?php

namespace App\Services\Messaging;

use App\Models\Tenant;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Throwable;

/**
 * Transactional email sender. Reads provider credentials from the current
 * tenant's `settings.integrations.email` JSON blob so merchants can manage
 * their own SMTP provider from the Settings UI without touching `.env`.
 *
 * Falls back to .env (config('mail.*')) if the tenant has not configured
 * anything yet.
 */
class EmailService
{
    /**
     * Merge config: tenant overrides → fallback .env.
     */
    public function getConfig(?Tenant $tenant = null): array
    {
        $tenant ??= $this->resolveTenant();
        $tenantEmail = data_get($tenant?->settings, 'integrations.email', []);

        return [
            'enabled' => $tenantEmail['enabled'] ?? config('messaging.email.enabled', false),
            'provider' => $tenantEmail['provider'] ?? 'SendGrid',
            'host' => $tenantEmail['host'] ?? config('mail.mailers.smtp.host'),
            'port' => (int) ($tenantEmail['port'] ?? config('mail.mailers.smtp.port', 587)),
            'username' => $tenantEmail['username'] ?? config('mail.mailers.smtp.username'),
            'password' => $tenantEmail['password'] ?? config('mail.mailers.smtp.password'),
            'encryption' => $tenantEmail['encryption'] ?? 'tls',
            'from_address' => $tenantEmail['from_address'] ?? config('mail.from.address'),
            'from_name' => $tenantEmail['from_name'] ?? config('mail.from.name'),
        ];
    }

    /**
     * Returns a copy of the config that's safe to expose via the API —
     * the password is masked.
     */
    public function getConfigMasked(?Tenant $tenant = null): array
    {
        $c = $this->getConfig($tenant);
        $password = $c['password'] ?? '';
        $c['password'] = $password
            ? str_repeat('•', 4).substr($password, -4)
            : '';
        $c['has_password'] = (bool) $password;

        return $c;
    }

    /**
     * Persist new email settings onto the current tenant's settings JSON.
     * If a field is null in $patch it is left untouched (so the UI doesn't
     * accidentally wipe the password by PUT-ing without it).
     */
    public function updateConfig(array $patch, ?Tenant $tenant = null): void
    {
        $tenant ??= $this->resolveTenant();
        if (! $tenant) {
            return;
        }

        $current = data_get($tenant->settings, 'integrations.email', []);

        foreach ($patch as $key => $value) {
            if ($value !== null && $value !== '') {
                $current[$key] = $value;
            }
        }

        $settings = $tenant->settings ?? [];
        $settings['integrations']['email'] = $current;
        $tenant->settings = $settings;
        $tenant->save();
    }

    /**
     * Send a plain-text or HTML email.
     */
    public function send(string $to, string $subject, string $body, ?string $toName = null): bool
    {
        $config = $this->getConfig();

        if (! ($config['enabled'] ?? false)) {
            Log::info("[EMAIL-STUB] to={$to} subject={$subject}");

            return true;
        }

        try {
            $mailer = $this->buildMailer($config);

            $message = (new Email())
                ->from(new Address($config['from_address'], $config['from_name'] ?? ''))
                ->to(new Address($to, $toName ?? ''))
                ->subject($subject)
                ->html($body);

            $mailer->send($message);

            return true;
        } catch (Throwable $e) {
            Log::error('EmailService::send failed', [
                'to' => $to,
                'subject' => $subject,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Try to connect to the SMTP provider and send nothing — used by the
     * Settings page "Test connection" button.
     *
     * Returns true on success or throws with a readable message.
     */
    public function testConnection(?array $configOverride = null): void
    {
        $config = $configOverride ?? $this->getConfig();
        $mailer = $this->buildMailer($config);

        // The cheapest way to validate creds: a 1-line noop send to the from-address.
        $message = (new Email())
            ->from(new Address($config['from_address'], $config['from_name'] ?? ''))
            ->to(new Address($config['from_address']))
            ->subject('Stamply SMTP connection test')
            ->text('If you see this, SMTP credentials are valid.');

        $mailer->send($message);
    }

    private function buildMailer(array $config): Mailer
    {
        $host = (string) ($config['host'] ?? '');
        $port = (int) ($config['port'] ?? 587);
        // Port 465 is implicit TLS, 587 uses STARTTLS which is handled by EsmtpTransport automatically.
        $tls = $port === 465;

        $transport = new EsmtpTransport($host, $port, $tls);
        if (! empty($config['username'])) {
            $transport->setUsername($config['username']);
        }
        if (! empty($config['password'])) {
            $transport->setPassword($config['password']);
        }

        return new Mailer($transport);
    }

    private function resolveTenant(): ?Tenant
    {
        $user = auth()->user();
        if ($user && $user->tenant_id) {
            return Tenant::find($user->tenant_id);
        }

        // Fallback: first tenant (for CLI commands like mail:test)
        return Tenant::first();
    }
}
