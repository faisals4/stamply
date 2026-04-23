/**
 * Thin wrapper around `expo-dynamic-app-icon`.
 *
 * Detection strategy (revised for Expo Modules registry):
 *   1. Fast-path platform check (iOS only).
 *   2. Use `requireOptionalNativeModule` from `expo-modules-core`.
 *      Expo Modules do NOT appear in the classic React Native
 *      `NativeModules` object — they register in Expo's own registry
 *      accessible via `requireOptionalNativeModule` / `requireNativeModule`.
 *      `requireOptional...` returns `null` when the module isn't
 *      baked into the binary (Expo Go, old dev client, release before
 *      plugin was added) and never throws.
 *   3. Only if the native side is present do we `require()` the JS
 *      wrapper. At that point its top-level `requireNativeModule` call
 *      will succeed cleanly.
 *
 * Schema note: the backend uses `'default'` for the primary icon, but
 * `expo-dynamic-app-icon` expects `null` to reset to CFBundleIcon. This
 * helper maps `'default' → null` so callers can stay schema-agnostic.
 */

import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type AppIconKey =
  | 'default'
  | 'white'
  | 'ramadan'
  | 'eid'
  | 'national_day';

const VALID_KEYS: AppIconKey[] = [
  'default',
  'white',
  'ramadan',
  'eid',
  'national_day',
];

type DynamicIconModule = {
  setAppIcon: (name: string | null) => Promise<string>;
  getAppIcon: () => Promise<string>;
};

// One-shot memoised loader. Runs at most once per JS session.
let cached: DynamicIconModule | null | undefined;

function loadModule(): DynamicIconModule | null {
  if (cached !== undefined) return cached;

  if (Platform.OS !== 'ios') {
    cached = null;
    return cached;
  }

  // Gate 1: is the Expo native side actually registered?
  // `requireOptionalNativeModule` returns null when the module isn't
  // baked into this binary and never throws. Safe on Expo Go, old
  // dev clients, and release builds predating the plugin.
  const native = requireOptionalNativeModule<any>('ExpoDynamicAppIcon');
  if (!native) {
    cached = null;
    return cached;
  }

  // Gate 2: the native module exposes `setAppIcon` and `getAppIcon`
  // directly through the Expo module definition. We can call them
  // without going through the `expo-dynamic-app-icon` JS wrapper.
  const setAppIcon = native.setAppIcon;
  const getAppIcon = native.getAppIcon;
  if (typeof setAppIcon !== 'function' || typeof getAppIcon !== 'function') {
    cached = null;
    return cached;
  }
  cached = {
    setAppIcon: (name: string | null) => native.setAppIcon(name ?? ''),
    getAppIcon: () => native.getAppIcon(),
  };
  return cached;
}

export function isDynamicIconSupported(): boolean {
  return loadModule() !== null;
}

/**
 * Returns the currently-set alternate icon name, or `'default'` when
 * no alternate is active (i.e. the app is on its primary CFBundleIcon).
 */
export async function getCurrentAppIcon(): Promise<AppIconKey> {
  const mod = loadModule();
  if (!mod) return 'default';
  try {
    const current = await mod.getAppIcon();
    if (!current || current === 'DEFAULT' || current === 'default') {
      return 'default';
    }
    if (VALID_KEYS.includes(current as AppIconKey)) {
      return current as AppIconKey;
    }
    return 'default';
  } catch {
    return 'default';
  }
}

/**
 * Applies the given icon. Returns `true` on success, `false` if the
 * native module isn't available, the key is invalid, or the user
 * declined the iOS system confirmation dialog.
 */
export async function applyAppIcon(key: AppIconKey): Promise<boolean> {
  const mod = loadModule();
  if (!mod) return false;
  if (!VALID_KEYS.includes(key)) return false;

  try {
    // Skip if already on this icon — otherwise iOS re-shows the
    // confirmation dialog on every launch.
    const current = await getCurrentAppIcon();
    if (current === key) return true;

    // `null` restores the primary CFBundleIcon (our orange "default").
    await mod.setAppIcon(key === 'default' ? null : key);
    return true;
  } catch {
    return false;
  }
}
