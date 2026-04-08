<?php

namespace App\Services;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Thin accessor for `platform_settings` rows with in-request caching so
 * high-traffic code paths (like push dispatch) don't hit the DB on every
 * single notification.
 *
 * Cached for 5 minutes in the application cache — updates from the /op
 * panel invalidate the cache on write, so admins see changes immediately.
 */
class PlatformSettingsService
{
    private const CACHE_PREFIX = 'platform_setting:';
    private const TTL_SECONDS = 300;

    public function get(string $key, array $default = []): array
    {
        return Cache::remember(
            self::CACHE_PREFIX.$key,
            self::TTL_SECONDS,
            fn () => PlatformSetting::where('key', $key)->first()?->value ?? $default,
        );
    }

    public function set(string $key, array $value): void
    {
        PlatformSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget(self::CACHE_PREFIX.$key);
    }

    /**
     * Partial update — merges with the existing value so callers can pass
     * just the fields they want to change without wiping the rest.
     */
    public function merge(string $key, array $patch): array
    {
        $current = $this->get($key);
        $merged = array_merge($current, $patch);
        $this->set($key, $merged);

        return $merged;
    }

    public function forget(string $key): void
    {
        PlatformSetting::where('key', $key)->delete();
        Cache::forget(self::CACHE_PREFIX.$key);
    }
}
