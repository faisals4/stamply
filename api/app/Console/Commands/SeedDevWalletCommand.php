<?php

namespace App\Console\Commands;

use App\Services\PlatformSettingsService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * Seed `platform_settings.wallet.apple` with a SELF-SIGNED certificate
 * so the entire .pkpass pipeline (signing, download, web service,
 * queue) can be exercised end-to-end without real Apple credentials.
 *
 * IMPORTANT — what you can and can't do with these dev credentials:
 *
 *   ✅ The /api/public/wallet/apple/{serial}.pkpass endpoint will return
 *      a syntactically-valid .pkpass file you can inspect.
 *   ✅ ApplePassBuilder will sign without errors (openssl_pkcs7_sign
 *      doesn't verify the chain — it just embeds whatever cert you give
 *      it).
 *   ✅ All five PassKit web service endpoints will work, and you can
 *      curl them with the per-card auth token.
 *   ✅ The CashierController stamp mutations will queue
 *      SendApplePassUpdate jobs and you can watch them in the worker.
 *
 *   ❌ A real iPhone will REFUSE to install the resulting .pkpass —
 *      iOS verifies the signature against Apple's WWDR root, and a
 *      self-signed cert obviously isn't trusted.
 *   ❌ APNs (api.push.apple.com) will reject the mTLS handshake, so the
 *      job is short-circuited via the `is_development` flag and only
 *      logs the intended push instead of sending it.
 *
 * Usage:
 *   php artisan wallet:seed-dev
 *   php artisan wallet:seed-dev --force   # overwrite existing creds
 */
#[Signature('wallet:seed-dev {--force : Overwrite existing wallet.apple credentials}')]
#[Description('Generate a self-signed Apple Wallet cert and seed it into platform_settings for local development')]
class SeedDevWalletCommand extends Command
{
    public function handle(PlatformSettingsService $settings): int
    {
        $existing = $settings->get('wallet.apple');
        if (! empty($existing['cert_pem']) && ! $this->option('force')) {
            $this->error('wallet.apple already has a certificate. Re-run with --force to overwrite.');

            return self::FAILURE;
        }

        $this->info('Generating self-signed RSA key + certificate (RSA 2048, valid 365 days)...');

        [$certPem, $keyPem] = $this->generateSelfSignedCert();

        $this->info('Storing dev credentials in platform_settings.wallet.apple...');

        $payload = [
            'pass_type_id' => 'pass.dev.stamply.local',
            'team_id' => 'DEVTEAM00',
            'organization_name' => 'Stamply (Dev)',
            'cert_pem' => $certPem,
            'key_pem' => $keyPem,
            'key_password' => '',
            // No wwdr_cert_pem override — ApplePassBuilder falls back to
            // the bundled wwdr-g4.pem in resources/wallet-assets/apple,
            // which is plenty for openssl_pkcs7_sign to embed in the
            // PKCS#7 envelope. iOS won't trust the result anyway.
            'use_sandbox' => true,
            'is_development' => true,
        ];

        $settings->set('wallet.apple', $payload);

        $this->newLine();
        $this->line('  <fg=green>✓</> wallet.apple seeded with development credentials');
        $this->line('  <fg=yellow>⚠</> The signed .pkpass will NOT install on a real iPhone');
        $this->line('  <fg=yellow>⚠</> APNs pushes are short-circuited (logged instead of sent)');
        $this->newLine();
        $this->line('  Pass Type ID  : pass.dev.stamply.local');
        $this->line('  Team ID       : DEVTEAM00');
        $this->newLine();
        $this->line('  Next steps:');
        $this->line('    1. php artisan migrate     # if you haven\'t already');
        $this->line('    2. php artisan queue:work  # so SendApplePassUpdate runs');
        $this->line('    3. Visit /api/public/wallet/apple/{serial}.pkpass');
        $this->line('    4. When you have real Apple creds, upload them via /op/settings');
        $this->newLine();

        return self::SUCCESS;
    }

    /**
     * @return array{0: string, 1: string} [cert_pem, key_pem]
     */
    private function generateSelfSignedCert(): array
    {
        $key = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        if ($key === false) {
            throw new RuntimeException('openssl_pkey_new failed: '.openssl_error_string());
        }

        // Distinguished name mimics the shape of a real Pass Type ID
        // cert so anything inspecting the subject doesn't choke. None of
        // these values matter to ApplePassBuilder.
        $dn = [
            'countryName' => 'SA',
            'stateOrProvinceName' => 'Riyadh',
            'localityName' => 'Riyadh',
            'organizationName' => 'Stamply (Dev)',
            'organizationalUnitName' => 'Local Development',
            'commonName' => 'Pass Type ID: pass.dev.stamply.local',
            'emailAddress' => 'dev@stamply.local',
        ];

        $csr = openssl_csr_new($dn, $key, ['digest_alg' => 'sha256']);
        if ($csr === false) {
            throw new RuntimeException('openssl_csr_new failed: '.openssl_error_string());
        }

        $cert = openssl_csr_sign($csr, null, $key, days: 365, options: ['digest_alg' => 'sha256']);
        if ($cert === false) {
            throw new RuntimeException('openssl_csr_sign failed: '.openssl_error_string());
        }

        if (! openssl_x509_export($cert, $certPem)) {
            throw new RuntimeException('openssl_x509_export failed: '.openssl_error_string());
        }
        if (! openssl_pkey_export($key, $keyPem)) {
            throw new RuntimeException('openssl_pkey_export failed: '.openssl_error_string());
        }

        return [$certPem, $keyPem];
    }
}
