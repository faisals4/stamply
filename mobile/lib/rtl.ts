import { useTranslation } from 'react-i18next';

/**
 * Whether the active locale lays out right-to-left.
 *
 * Uses i18next's `dir()` instead of `I18nManager.isRTL` because:
 *   - On web we set `document.documentElement.dir` directly from the
 *     locale (see `app/_layout.tsx`) and don't touch `I18nManager`,
 *     so `I18nManager.isRTL` is stale.
 *   - On native both are kept in sync, but `i18n.dir()` remains the
 *     single source of truth regardless of platform.
 *
 * Typical use: flip directional icons (back arrows, drill-in chevrons)
 * so a `ChevronLeft` in LTR becomes a `ChevronRight` in RTL.
 */
export function useIsRTL(): boolean {
  const { i18n } = useTranslation();
  return i18n.dir() === 'rtl';
}
