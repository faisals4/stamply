import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useIsRTL } from './rtl';

/**
 * Returns the correct drill chevron icon for the current locale direction.
 * RTL → ChevronLeft (points inline-end), LTR → ChevronRight.
 *
 * Replaces the repeated pattern:
 *   const DrillIcon = isRTL ? ChevronLeft : ChevronRight;
 */
export function useDrillChevron() {
  const isRTL = useIsRTL();
  return isRTL ? ChevronLeft : ChevronRight;
}
