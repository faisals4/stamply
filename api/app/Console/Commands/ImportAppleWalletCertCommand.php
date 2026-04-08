<?php

namespace App\Console\Commands;

use App\Services\PlatformSettingsService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Import a real Apple Wallet Pass Type ID certificate from a `.pem`
 * file (the format `openssl pkcs12 -in cert.p12 -nodes` produces) and
 * store it in `platform_settings.wallet.apple`.
 *
 * The .pem file is expected to contain BOTH a CERTIFICATE block and a
 * PRIVATE KEY block back-to-back (the standard Keychain export). The
 * Pass Type ID and Team ID are auto-extracted from the cert subject
 * so the operator doesn't have to type them.
 *
 * Usage:
 *   php artisan wallet:import-apple-cert /path/to/Certificates.pem
 *   php artisan wallet:import-apple-cert /path/to/Certificates.pem --password=secret
 */
#[Signature('wallet:import-apple-cert {path : Path to a combined cert+key .pem file} {--password= : Private key password if encrypted}')]
#[Description('Import an Apple Wallet Pass Type ID certificate into platform_settings')]
class ImportAppleWalletCertCommand extends Command
{
    public function handle(PlatformSettingsService $settings): int
    {
        $path = (string) $this->argument('path');
        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $contents = file_get_contents($path);
        if ($contents === false || trim($contents) === '') {
            $this->error("File is empty or unreadable: {$path}");

            return self::FAILURE;
        }

        // Pull the first CERTIFICATE and the first PRIVATE KEY block.
        $certPem = $this->extractBlock($contents, ['CERTIFICATE']);
        $keyPem = $this->extractBlock($contents, ['PRIVATE KEY', 'RSA PRIVATE KEY', 'EC PRIVATE KEY', 'ENCRYPTED PRIVATE KEY']);

        if ($certPem === null) {
            $this->error('No CERTIFICATE block found in the file.');

            return self::FAILURE;
        }
        if ($keyPem === null) {
            $this->error('No PRIVATE KEY block found in the file. If the .pem only has the cert, export the key separately.');

            return self::FAILURE;
        }

        // Parse the cert subject so the operator gets pass_type_id +
        // team_id auto-filled. Both live in the cert and a real Apple
        // Pass Type ID cert encodes them in well-known places:
        //   - UID = pass.com.example.foo                (Pass Type ID)
        //   - OU  = G5V3R5V5QZ                          (Team ID)
        //   - O   = "Your Company Name"                 (org name)
        $parsed = openssl_x509_parse($certPem);
        if ($parsed === false) {
            $this->error('Failed to parse the certificate. Is it a valid PEM?');

            return self::FAILURE;
        }

        $subject = $parsed['subject'] ?? [];
        $passTypeId = (string) ($subject['UID'] ?? '');
        $teamId = (string) ($subject['OU'] ?? '');
        $orgName = (string) ($subject['O'] ?? '');

        if ($passTypeId === '' || ! str_starts_with($passTypeId, 'pass.')) {
            $this->error('Could not find a Pass Type ID (UID=pass.*) in the certificate subject.');
            $this->line('Subject was: '.json_encode($subject));

            return self::FAILURE;
        }

        $this->info('Parsed certificate:');
        $this->line('  Pass Type ID : '.$passTypeId);
        $this->line('  Team ID      : '.$teamId);
        $this->line('  Organization : '.$orgName);
        if (isset($parsed['validTo_time_t'])) {
            $this->line('  Expires      : '.date('Y-m-d', (int) $parsed['validTo_time_t']));
        }

        $patch = [
            'pass_type_id' => $passTypeId,
            'team_id' => $teamId,
            'organization_name' => $orgName !== '' ? $orgName : 'Stamply',
            'cert_pem' => $certPem,
            'key_pem' => $keyPem,
            // Wipe the dev short-circuit — this is a real cert.
            'is_development' => false,
            'use_sandbox' => false,
        ];

        $password = (string) $this->option('password');
        if ($password !== '') {
            $patch['key_password'] = $password;
        }

        $settings->merge('wallet.apple', $patch);

        $this->newLine();
        $this->line('  <fg=green>✓</> wallet.apple updated with the imported certificate');
        $this->line('  <fg=green>✓</> is_development cleared — APNs will hit Apple for real');
        $this->newLine();
        $this->warn('Reminder: webServiceURL/authenticationToken are only emitted when APP_URL is HTTPS.');
        $this->line('  Current APP_URL: '.config('app.url'));
        $this->line('  For local testing with auto-update: use ngrok or Cloudflare Tunnel and set APP_URL to the https URL.');
        $this->newLine();

        return self::SUCCESS;
    }

    /**
     * Extract the first PEM block of any of the given types from a
     * blob of text. Returns the full `-----BEGIN ...----- ... -----END ...-----`
     * block as a string, or null if none of the requested types is
     * present.
     *
     * @param  list<string>  $types
     */
    private function extractBlock(string $contents, array $types): ?string
    {
        foreach ($types as $type) {
            $pattern = '/-----BEGIN '.preg_quote($type, '/').'-----.*?-----END '.preg_quote($type, '/').'-----/s';
            if (preg_match($pattern, $contents, $m)) {
                return trim($m[0])."\n";
            }
        }

        return null;
    }
}
