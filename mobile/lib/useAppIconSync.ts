/**
 * useAppIconSync — polls the backend for the current "blessed" app
 * icon variant and, when it differs from the icon currently set on
 * the device, asks iOS to switch.
 *
 * Current plugin (`expo-dynamic-app-icon`) uses the private
 * `_setAlternateIconName` selector, so the swap happens silently
 * without the system confirmation dialog. See lib/dynamicAppIcon.ts.
 *
 * Runs:
 *   - Once on mount (cold start)
 *   - Whenever the app comes back to foreground
 *
 * Gracefully no-ops on web and Android.
 */

import { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  applyAppIcon,
  getCurrentAppIcon,
  isDynamicIconSupported,
  type AppIconKey,
} from './dynamicAppIcon';

/**
 * Mirror of the small subset of `lib/api.ts`'s base-URL resolution
 * that we need here. Kept inline to avoid pulling the authenticated
 * client — this endpoint is intentionally public so we can fetch it
 * BEFORE the user is logged in (fresh install scenario).
 */
function resolveApiBase(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api`;
    }
    return '/api';
  }
  const fromEnv = (process.env as any).EXPO_PUBLIC_API_URL;
  const fromConfig = (Constants.expoConfig?.extra as any)?.apiUrl;
  return fromEnv || fromConfig || 'https://stamply.ngrok.app/api';
}

type AppIconResponse = {
  data?: {
    // The /api/app/config/app-icon endpoint returns the active
    // variant under `key`, not `active`. See
    // api/app/Http/Controllers/Api/Op/AppIconController::current().
    key?: AppIconKey;
  };
};

async function fetchActiveIcon(): Promise<AppIconKey | null> {
  try {
    const res = await fetch(`${resolveApiBase()}/app/config/app-icon`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as AppIconResponse;
    const key = body?.data?.key;
    return key ?? null;
  } catch {
    return null;
  }
}

async function syncOnce(): Promise<void> {
  if (!isDynamicIconSupported()) return;

  const desired = await fetchActiveIcon();
  if (!desired) return;

  const current = await getCurrentAppIcon();
  if (current === desired) return;

  // Fire-and-forget — the plugin's setAppIcon swaps silently and
  // resolves quickly; failures just mean the next foreground cycle
  // will retry.
  void applyAppIcon(desired);
}

export function useAppIconSync() {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (!isDynamicIconSupported()) return;

    // Initial sync on mount.
    void syncOnce();

    // Re-sync whenever the app returns from background, so operators
    // can schedule a change (e.g. switch to Eid icon at midnight) and
    // existing users pick it up without needing a cold-launch.
    const handler = (state: AppStateStatus) => {
      if (state === 'active') void syncOnce();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, []);
}
