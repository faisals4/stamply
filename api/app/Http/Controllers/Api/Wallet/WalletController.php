<?php

namespace App\Http\Controllers\Api\Wallet;

use App\Http\Controllers\Controller;
use App\Models\IssuedCard;
use App\Models\Tenant;
use App\Services\PlatformSettingsService;
use App\Services\Wallet\Apple\ApplePassBuilder;
use App\Services\Wallet\Google\GooglePassBuilder;
use App\Services\Wallet\WalletAvailability;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use RuntimeException;

class WalletController extends Controller
{
    /**
     * GET /api/public/wallet/availability
     * Returns which wallet providers AND messaging providers are configured.
     * Used by both the public PWA (to show "Add to Wallet" buttons) and the
     * merchant Settings page (integration status panel).
     */
    public function availability(): JsonResponse
    {
        $wallet = WalletAvailability::snapshot();

        // Read messaging flags from the current tenant (falls back to .env
        // via the service config merge if the tenant hasn't configured).
        $tenant = auth()->user()?->tenant_id
            ? Tenant::find(auth()->user()->tenant_id)
            : Tenant::first();
        $tenantSettings = $tenant?->settings ?? [];

        return response()->json([
            'data' => [
                ...$wallet,
                'email' => (bool) data_get(
                    $tenantSettings,
                    'integrations.email.enabled',
                    config('messaging.email.enabled'),
                ),
                'sms' => (bool) data_get(
                    $tenantSettings,
                    'integrations.sms.enabled',
                    config('messaging.sms.enabled'),
                ),
            ],
        ]);
    }

    /**
     * GET /api/public/wallet/apple/{serial}.pkpass
     * Download the signed .pkpass for Apple Wallet. Phase 2 scaffold — will
     * throw a clear error until certificates are installed.
     */
    public function applePkPass(string $serial): Response|JsonResponse
    {
        $card = IssuedCard::withoutGlobalScopes()
            ->where('serial_number', $serial)
            ->firstOrFail();

        // Backfill the per-card auth token and Last-Modified tag before
        // signing. Without these, iOS Wallet would either fail to call
        // back (no token to authenticate with) or always think the pass
        // is up-to-date (Last-Modified = epoch 0).
        $card->ensureAppleAuthToken();
        if ((int) $card->pass_updated_at === 0) {
            $card->update(['pass_updated_at' => now()->timestamp]);
        }

        try {
            $builder = new ApplePassBuilder($card);
            $bytes = $builder->signPkPass();

            // `inline` (not `attachment`) so Safari on iPhone /
            // iPad / macOS hands the pass off to Wallet instead of
            // forcing a download. Wallet keys off Content-Type
            // `application/vnd.apple.pkpass` as long as the
            // browser doesn't see `Content-Disposition: attachment`.
            // On desktop Chrome/Firefox the file is saved via the
            // `filename` hint as a fallback — they don't support
            // Wallet anyway.
            $headers = [
                'Content-Type' => 'application/vnd.apple.pkpass',
                'Content-Disposition' => "inline; filename=\"stamply-{$serial}.pkpass\"",
            ];

            // Heads-up header so anyone curl-ing the dev .pkpass knows
            // it won't actually install on a real iPhone.
            $cfg = app(PlatformSettingsService::class)->get('wallet.apple');
            if (! empty($cfg['is_development'])) {
                $headers['X-Stamply-Dev-Pass'] = 'true; self-signed; will not install on real devices';
            }

            return response($bytes, 200, $headers);
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => 'wallet_not_configured',
                'message' => $e->getMessage(),
                'setup_docs' => url('/docs/wallet-setup.md'),
            ], 503);
        }
    }

    /**
     * GET /api/public/wallet/google/{serial}
     * Returns a signed "Save to Google Wallet" URL. The customer
     * clicks it from the public /i/{serial} page on their Android
     * device to add the card to Google Wallet.
     *
     * Behind the scenes this upserts both the loyaltyClass and the
     * loyaltyObject in Google's backend before signing the JWT, so
     * the click always resolves to a valid pass.
     */
    public function googleSaveUrl(string $serial): JsonResponse
    {
        $card = IssuedCard::withoutGlobalScopes()
            ->where('serial_number', $serial)
            ->firstOrFail();

        try {
            $builder = app()->make(GooglePassBuilder::class, ['card' => $card]);

            return response()->json([
                'data' => [
                    'save_url' => $builder->buildSaveUrl(),
                ],
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => 'wallet_not_configured',
                'message' => $e->getMessage(),
                'setup_docs' => url('/docs/wallet-setup.md'),
            ], 503);
        }
    }
}
