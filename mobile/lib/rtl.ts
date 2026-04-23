import { I18nManager, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * Whether the active locale is RTL.
 * Used for icons (chevrons), conditional text, etc.
 * Always returns the TRUE locale direction.
 */
export function useIsRTL(): boolean {
  const { i18n } = useTranslation();
  return i18n.dir() === 'rtl';
}

/**
 * Whether manual layout flipping is needed.
 *
 * On iOS/Android native, `I18nManager.isRTL = true` automatically
 * flips `flexDirection: 'row'` and `textAlign: 'left'`. Using
 * `'row-reverse'` or `textAlign: 'right'` would DOUBLE-FLIP.
 *
 * On Web, React Native Web does NOT auto-flip flex/text.
 * We must flip manually with `'row-reverse'` / `textAlign: 'right'`.
 *
 * Usage:
 *   const layoutRTL = useLayoutRTL();
 *   style={{ flexDirection: layoutRTL ? 'row-reverse' : 'row' }}
 */
export function useLayoutRTL(): boolean {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (Platform.OS !== 'web') {
    // Native: I18nManager auto-flips. No manual flip needed.
    return false;
  }
  // Web: manual flip needed.
  return isRTL;
}
