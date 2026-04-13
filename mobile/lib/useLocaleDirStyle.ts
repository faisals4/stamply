import { useIsRTL } from './rtl';

/**
 * Returns a `writingDirection` style object that forces Arabic
 * text to align with the LOCALE direction on react-native-web,
 * instead of the per-Text auto-detection that react-native-web
 * applies (which flips Arabic text to RTL even on LTR pages).
 *
 * Before this hook, every component that rendered Arabic strings
 * in a `<Text>` element duplicated this exact 1-liner inline:
 *
 *   const localeDirStyle = { writingDirection: isRTL ? 'rtl' : 'ltr' } as const;
 *
 * Now all ~25 files import and call this instead:
 *
 *   const localeDirStyle = useLocaleDirStyle();
 *
 * The return value is stable between renders (same object
 * reference) as long as the locale direction hasn't changed,
 * so passing it as a style prop doesn't trigger unnecessary
 * re-renders.
 */
export function useLocaleDirStyle() {
  const isRTL = useIsRTL();
  return { writingDirection: isRTL ? 'rtl' : 'ltr' } as const;
}
