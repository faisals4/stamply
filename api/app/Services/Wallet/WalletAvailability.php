<?php

namespace App\Services\Wallet;

use App\Services\PlatformSettingsService;

/**
 * Tiny helper that reports whether each wallet provider is enabled AND has
 * the required credentials stored at the platform level. The frontend uses
 * this to decide which "Add to Wallet" buttons to show on /i/:serial.
 *
 * Credentials now live in the `platform_settings` table (managed from
 * /op/settings), not in config files — this means a new tenant can issue
 * wallet passes the moment the operator uploads Stamply's certs once.
 */
class WalletAvailability
{
    public static function apple(): bool
    {
        $cfg = (new PlatformSettingsService())->get('wallet.apple');

        // Apple Wallet needs: pass_type_id + team_id + cert + private key.
        // wwdr_cert is optional (the PHP library bundles its own).
        // organization_name is optional (we can fall back to tenant name).
        return ! empty($cfg['pass_type_id'])
            && ! empty($cfg['team_id'])
            && ! empty($cfg['cert_pem'])
            && ! empty($cfg['key_pem']);
    }

    public static function google(): bool
    {
        $cfg = (new PlatformSettingsService())->get('wallet.google');

        // Google Wallet needs: issuer_id + service account JSON.
        return ! empty($cfg['issuer_id']) && ! empty($cfg['service_account']);
    }

    public static function snapshot(): array
    {
        return [
            'apple' => static::apple(),
            'google' => static::google(),
            // PWA is always available — it's just the web view
            'pwa' => true,
        ];
    }
}
