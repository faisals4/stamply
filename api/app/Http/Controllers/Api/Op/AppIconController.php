<?php

namespace App\Http\Controllers\Api\Op;

use App\Http\Controllers\Controller;
use App\Services\PlatformSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * /op admin endpoints for the mobile app icon variant.
 *
 * The mobile app ships every icon variant bundled in its binary — the
 * only thing we control from the backend is WHICH of those pre-shipped
 * variants is currently "active". When the operator toggles a variant
 * here, the mobile client picks it up on its next /api/app/config
 * poll and calls iOS's setAlternateIconName, which shows the standard
 * system confirmation alert before the icon actually swaps.
 *
 * Adding a new variant requires a mobile app update — the backend
 * just chooses from the whitelisted set below.
 */
class AppIconController extends Controller
{
    /**
     * Allowed variant keys — must match the icon asset names bundled
     * in mobile/assets/app-icons/ and declared in expo-dynamic-app-icon
     * config. Adding a key here without shipping the matching icon
     * asset would cause iOS setAlternateIconName to throw.
     */
    public const VARIANTS = [
        'default' => [
            'label_ar' => 'ستامبلي برتقالي',
            'label_en' => 'Stamply Orange',
            'is_default' => true,
        ],
        'white' => [
            'label_ar' => 'ستامبلي أبيض',
            'label_en' => 'Stamply White',
            'is_default' => false,
        ],
        'ramadan' => [
            'label_ar' => 'رمضان',
            'label_en' => 'Ramadan',
            'is_default' => false,
        ],
        'eid' => [
            'label_ar' => 'العيد',
            'label_en' => 'Eid',
            'is_default' => false,
        ],
        'national_day' => [
            'label_ar' => 'اليوم الوطني',
            'label_en' => 'National Day',
            'is_default' => false,
        ],
    ];

    public function __construct(
        private readonly PlatformSettingsService $settings,
    ) {}

    /**
     * GET /api/op/settings/app-icon
     *
     * Returns the full variant catalogue + which one is currently
     * active. The catalogue is a constant on this controller so a new
     * variant can never be mis-spelled from the UI — the admin picks
     * from the dropdown the backend itself ships.
     */
    public function show(): JsonResponse
    {
        $active = $this->settings->get('app.icon_variant');
        $activeKey = is_array($active) && isset($active['key'])
            ? $active['key']
            : 'default';

        // If an earlier setter wrote a variant that we later removed,
        // fall back to default so the client never gets a ghost.
        if (! array_key_exists($activeKey, self::VARIANTS)) {
            $activeKey = 'default';
        }

        $variants = [];
        foreach (self::VARIANTS as $key => $meta) {
            $variants[] = [
                'key' => $key,
                'label_ar' => $meta['label_ar'],
                'label_en' => $meta['label_en'],
                'is_default' => $meta['is_default'],
                'is_active' => $key === $activeKey,
            ];
        }

        return response()->json([
            'data' => [
                'active' => $activeKey,
                'variants' => $variants,
            ],
        ]);
    }

    /**
     * PUT /api/op/settings/app-icon
     * Body: { "key": "default" | "white" | "ramadan" | "eid" | "national_day" }
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'in:'.implode(',', array_keys(self::VARIANTS))],
        ]);

        $this->settings->set('app.icon_variant', [
            'key' => $data['key'],
            'updated_at' => now()->toIso8601String(),
        ]);

        return $this->show();
    }

    /**
     * GET /api/app/config/app-icon (public, app-side)
     *
     * Lean endpoint the mobile client polls on cold start + on
     * foreground. Returns just the current variant key — no auth
     * required because knowing "we're on the Ramadan icon this week"
     * isn't sensitive info.
     */
    public function current(): JsonResponse
    {
        $active = $this->settings->get('app.icon_variant');
        $key = is_array($active) && isset($active['key'])
            ? $active['key']
            : 'default';

        if (! array_key_exists($key, self::VARIANTS)) {
            $key = 'default';
        }

        return response()->json([
            'data' => [
                'key' => $key,
                'updated_at' => is_array($active) ? ($active['updated_at'] ?? null) : null,
            ],
        ]);
    }
}
