<?php

namespace App\Http\Controllers\Api\Wallet;

use App\Http\Controllers\Controller;
use App\Models\ApplePassRegistration;
use App\Models\IssuedCard;
use App\Services\PlatformSettingsService;
use App\Services\Wallet\Apple\ApplePassBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Implements the Apple Wallet PassKit web service that the operating
 * system on every iPhone with one of our passes calls into. The full
 * spec lives at https://developer.apple.com/documentation/walletpasses
 * but the five endpoints below are all an issuing service ever needs.
 *
 *   - register / unregister: a device tells us "I have this pass and
 *     here's my APNs push token, ping me when it changes" (or "I'm done")
 *   - listUpdated: after iOS gets our APNs ping it asks "which of the
 *     passes I track have changed since tag T?"
 *   - getLatestPass: device fetches the new .pkpass bytes
 *   - log: iOS reports any pass-related errors back to us
 *
 * Auth model: every register/unregister/getLatestPass call carries
 * `Authorization: ApplePass <token>` where the token is the per-card
 * secret stored in `issued_cards.apple_auth_token`. We match it on the
 * serial. listUpdated and log have no Authorization header — they're
 * scoped to the device, not a single pass, so we just trust them.
 */
class ApplePassKitController extends Controller
{
    public function __construct(
        private readonly PlatformSettingsService $settings,
    ) {}

    /**
     * POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
     * Body: { "pushToken": "<hex>" }
     *
     * Returns 201 if the registration was newly created, 200 if it
     * already existed (idempotent), 401 if auth fails.
     */
    public function register(
        Request $request,
        string $deviceLibraryIdentifier,
        string $passTypeIdentifier,
        string $serialNumber,
    ): Response {
        $this->assertPassTypeMatches($passTypeIdentifier);
        $card = $this->authorizeForCard($request, $serialNumber);

        $pushToken = (string) $request->input('pushToken', '');
        if ($pushToken === '') {
            return response('', 400);
        }

        $existing = ApplePassRegistration::where('issued_card_id', $card->id)
            ->where('device_library_id', $deviceLibraryIdentifier)
            ->first();

        if ($existing) {
            // Token may have rotated — keep it fresh.
            if ($existing->push_token !== $pushToken) {
                $existing->update(['push_token' => $pushToken]);
            }

            return response('', 200);
        }

        // First-install detection: count registrations BEFORE we
        // insert the new row. Zero → this is the first device any
        // customer has used to add this specific card to Wallet.
        // We only want to fire the welcome lifecycle trigger on
        // first install because iOS renders the back field silently
        // the very first time it lands on a device (there's no
        // "previous value" to diff against). By writing the welcome
        // text NOW (after the baseline install) and then sending a
        // fresh push, iOS will do a proper re-fetch, compare the
        // empty baseline back field to the new welcome text, and
        // surface the lock-screen notification via the
        // `changeMessage` template we ship in pass.json.
        $isFirstRegistration = ApplePassRegistration::where('issued_card_id', $card->id)->count() === 0;

        ApplePassRegistration::create([
            'issued_card_id' => $card->id,
            'device_library_id' => $deviceLibraryIdentifier,
            'push_token' => $pushToken,
        ]);

        if ($isFirstRegistration) {
            // Dispatch after the current request finishes so the
            // initial pass install has fully landed on the device
            // before we ask iOS to re-fetch. The dispatcher itself
            // respects the merchant's enable flag, locale, and
            // variable rendering — nothing fires if welcome is off.
            app(\App\Services\Notifications\CardNotificationDispatcher::class)
                ->fire($card, 'welcome');
        }

        return response('', 201);
    }

    /**
     * DELETE /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
     * Idempotent unregister. Returns 200 even if the row was missing.
     */
    public function unregister(
        Request $request,
        string $deviceLibraryIdentifier,
        string $passTypeIdentifier,
        string $serialNumber,
    ): Response {
        $this->assertPassTypeMatches($passTypeIdentifier);
        $card = $this->authorizeForCard($request, $serialNumber);

        ApplePassRegistration::where('issued_card_id', $card->id)
            ->where('device_library_id', $deviceLibraryIdentifier)
            ->delete();

        return response('', 200);
    }

    /**
     * GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince=<tag>
     * No Authorization header — Apple skips it for this call.
     *
     * Returns 204 No Content when nothing has changed since `tag`,
     * otherwise 200 with { lastUpdated, serialNumbers }.
     */
    public function listUpdated(
        Request $request,
        string $deviceLibraryIdentifier,
        string $passTypeIdentifier,
    ): Response|JsonResponse {
        $this->assertPassTypeMatches($passTypeIdentifier);

        $since = (int) $request->query('passesUpdatedSince', '0');

        $rows = DB::table('apple_pass_registrations as r')
            ->join('issued_cards as c', 'c.id', '=', 'r.issued_card_id')
            ->where('r.device_library_id', $deviceLibraryIdentifier)
            ->where('c.pass_updated_at', '>', $since)
            ->whereNull('c.deleted_at')
            ->get(['c.serial_number', 'c.pass_updated_at']);

        // Log every iOS callback so we can prove end-to-end: after a
        // push, iOS must call this endpoint to fetch updated serials.
        // Silence here means the push didn't land (APNs dropped it,
        // iPhone was offline, or the pass has auto-updates disabled).
        Log::info('[apple-passkit] listUpdated', [
            'device' => $deviceLibraryIdentifier,
            'since' => $since,
            'returned' => $rows->count(),
        ]);

        if ($rows->isEmpty()) {
            return response('', 204);
        }

        return response()->json([
            'lastUpdated' => (string) $rows->max('pass_updated_at'),
            'serialNumbers' => $rows->pluck('serial_number')->values()->all(),
        ]);
    }

    /**
     * GET /v1/passes/{passTypeIdentifier}/{serialNumber}
     * Honour If-Modified-Since: return 304 when our pass_updated_at is
     * not newer than the device's cached copy. Otherwise rebuild and
     * sign a fresh .pkpass on the fly.
     */
    public function getLatestPass(
        Request $request,
        string $passTypeIdentifier,
        string $serialNumber,
    ): Response {
        $this->assertPassTypeMatches($passTypeIdentifier);
        $card = $this->authorizeForCard($request, $serialNumber);

        $passUpdatedAt = (int) $card->pass_updated_at;
        $lastModifiedHttp = gmdate('D, d M Y H:i:s', $passUpdatedAt).' GMT';

        $ifModifiedSince = $request->header('If-Modified-Since');
        if ($ifModifiedSince) {
            $clientTs = strtotime($ifModifiedSince);
            if ($clientTs !== false && $clientTs >= $passUpdatedAt) {
                Log::info('[apple-passkit] getLatestPass 304 (not modified)', [
                    'serial' => $serialNumber,
                    'client_ts' => $clientTs,
                    'server_ts' => $passUpdatedAt,
                ]);

                return response('', 304, ['Last-Modified' => $lastModifiedHttp]);
            }
        }

        Log::info('[apple-passkit] getLatestPass building fresh pkpass', [
            'serial' => $serialNumber,
            'pass_updated_at' => $passUpdatedAt,
            'announcement' => mb_substr((string) $card->announcement_text, 0, 80),
        ]);

        try {
            $bytes = (new ApplePassBuilder($card))->signPkPass();
        } catch (RuntimeException $e) {
            Log::error('[apple-passkit] failed to sign pass for getLatestPass', [
                'serial' => $serialNumber,
                'error' => $e->getMessage(),
            ]);

            return response('', 500);
        }

        return response($bytes, 200, [
            'Content-Type' => 'application/vnd.apple.pkpass',
            'Last-Modified' => $lastModifiedHttp,
        ]);
    }

    /**
     * POST /v1/log
     * Body: { "logs": ["string", ...] }
     * iOS reports pass errors here. We dump them to a dedicated log
     * channel so the operator can debug device-side issues.
     */
    public function log(Request $request): Response
    {
        $logs = (array) $request->input('logs', []);
        foreach ($logs as $line) {
            Log::channel('stack')->info('[apple-passkit-device] '.(string) $line);
        }

        return response('', 200);
    }

    /**
     * Match `Authorization: ApplePass <token>` against the per-card
     * secret. Aborts with 401 on any mismatch — and crucially returns
     * 401 (not 404) when the serial is unknown so we don't leak the
     * existence of any particular pass.
     */
    private function authorizeForCard(Request $request, string $serial): IssuedCard
    {
        $auth = (string) $request->header('Authorization', '');
        if (! Str::startsWith($auth, 'ApplePass ')) {
            abort(401);
        }
        $token = trim(substr($auth, 10));
        if ($token === '') {
            abort(401);
        }

        $card = IssuedCard::withoutGlobalScopes()
            ->where('serial_number', $serial)
            ->where('apple_auth_token', $token)
            ->first();

        if (! $card) {
            abort(401);
        }

        return $card;
    }

    /**
     * Reject calls for any pass type we don't issue. The configured
     * pass_type_id is the only one Stamply ever signs, so any other
     * value is either a misconfigured device or a probe.
     */
    private function assertPassTypeMatches(string $passTypeIdentifier): void
    {
        $configured = (string) ($this->settings->get('wallet.apple')['pass_type_id'] ?? '');
        if ($configured === '' || $configured !== $passTypeIdentifier) {
            abort(401);
        }
    }
}
