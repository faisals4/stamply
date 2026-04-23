import { Platform } from 'react-native';

/**
 * Which wallet badge(s) should we show to this device?
 *
 *   - Native iOS app → 'apple' only (Google Wallet doesn't exist on iOS)
 *   - Native Android app → 'google' only
 *   - Mobile Safari on iPhone/iPad → 'apple' only (the web /i/{serial}
 *     flow can hand off to Wallet via the .pkpass MIME type)
 *   - Chrome/Browser on Android → 'google' only
 *   - Everything else (desktop Chrome, Edge, Firefox, …) → 'both'
 *
 * Mirrors the web build's `detectWalletTarget()` in
 * `web/src/lib/wallet/detectTarget.ts` so a customer using both the
 * merchant PWA and the mobile web app sees the same button on the
 * same device.
 */
export type WalletTarget = 'apple' | 'google' | 'both';

export function detectWalletTarget(): WalletTarget {
  // Native mobile builds — the platform is unambiguous.
  if (Platform.OS === 'ios') return 'apple';
  if (Platform.OS === 'android') return 'google';

  // Web: sniff the user agent. We run on react-native-web so we
  // can reach navigator directly; guard for SSR / non-browser
  // environments where it's undefined.
  if (typeof navigator === 'undefined') return 'both';
  const ua = navigator.userAgent || '';

  // iOS Safari + iOS Chrome both identify as iPhone/iPad/iPod.
  // iPadOS 13+ may report as Mac — detect via touch points.
  const maxTouchPoints =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0
      : 0;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && maxTouchPoints > 1);
  if (isIOS) return 'apple';

  if (/Android/.test(ua)) return 'google';

  // Desktop — show both so the customer can pick whichever wallet
  // their phone is set up for.
  return 'both';
}
