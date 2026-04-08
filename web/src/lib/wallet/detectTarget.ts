/**
 * Decide which wallet button(s) to show on the public card page.
 *
 * The rules, in plain Arabic:
 *   - On an iPhone / iPad / iPod → show the Apple Wallet badge only.
 *   - On Android → show the Google Wallet badge only.
 *   - On anything else (desktop, undetectable mobile, edge cases) →
 *     show BOTH badges so the user can't get stuck. Mirrors the
 *     product rule the merchant asked for:
 *     "إذا لم تكتشف الجهاز أظهر الاثنين".
 *
 * Detection strategy:
 *
 * 1. Prefer `navigator.userAgentData.platform` when available. It's
 *    the modern Client Hints API — reliable, frozen to a short list,
 *    and not affected by User-Agent Reduction. Chrome / Edge / Samsung
 *    Internet support it; Safari does NOT, which means iPhone never
 *    hits this branch (handled in step 2).
 *
 * 2. Fall back to the classic User-Agent string regex. This is the
 *    only way to reliably detect iOS because Safari intentionally
 *    omits userAgentData. We also handle the "iPad Pro pretends to
 *    be a Mac" quirk that shipped with iPadOS 13: any UA that claims
 *    to be Macintosh AND exposes a touch event handler is an iPad.
 *
 * 3. Anything that matches neither branch returns `'both'`. That
 *    covers desktops, reduced-UA browsers, Chrome DevTools device
 *    emulation that didn't toggle touch, bots — the safe default.
 */

export type WalletTarget = 'apple' | 'google' | 'both'

export function detectWalletTarget(): WalletTarget {
  if (typeof navigator === 'undefined') return 'both'

  // 1) Client Hints (Chrome/Edge/Samsung Internet — never Safari).
  //    The `platform` field is a frozen enum so string comparison is
  //    stable across Chromium versions.
  const uaData = (
    navigator as Navigator & {
      userAgentData?: {
        platform?: string
        mobile?: boolean
      }
    }
  ).userAgentData

  if (uaData?.platform) {
    const platform = uaData.platform.toLowerCase()
    if (platform === 'android') return 'google'
    // `iOS` never appears here in practice (Safari doesn't implement
    // userAgentData), but we guard anyway in case a future WebKit
    // adds partial support.
    if (platform === 'ios') return 'apple'
    // 'macOS', 'Windows', 'Linux', 'Chrome OS', 'Unknown' → fall
    // through to the UA regex so the iPad-as-Mac case still lands
    // in the Apple branch, then ultimately `both` for real desktops.
  }

  // 2) User-Agent regex fallback — works everywhere, including Safari.
  const ua = navigator.userAgent || ''

  // iPadOS 13+ ships a desktop-class UA by default. Touch event
  // support is the simplest reliable signal that we're still on a
  // real iPad. (Touch on Mac laptops exists via trackpad but doesn't
  // expose `ontouchend` on the document.)
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (ua.includes('Macintosh') &&
      typeof document !== 'undefined' &&
      'ontouchend' in document)

  if (isIOS) return 'apple'

  if (/Android/i.test(ua)) return 'google'

  // 3) Undetectable or desktop — show everything.
  return 'both'
}
