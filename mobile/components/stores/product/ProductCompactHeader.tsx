import { Share2, X } from 'lucide-react-native';
import { colors } from '../../../lib/colors';
import { HeaderBar } from '../../ui/HeaderBar';
import { CircleButton } from '../../ui/CircleButton';
import type { Product } from '../types';

export const PRODUCT_COMPACT_HEADER_HEIGHT = 56;

const COMPACT_ICON = 16;

type Props = {
  product: Product;
  onClose: () => void;
  onShare?: () => void;
};

/**
 * Compact product-detail nav bar that fades in as the hero image
 * scrolls off screen. Uses `HeaderBar` with a custom `backIcon`
 * (X instead of the default chevron) because "close" makes more
 * semantic sense than "back" on a product detail page. The
 * end-action is a share button at the same 16 px icon size used
 * by the store-detail compact header.
 */
export function ProductCompactHeader({ product, onClose, onShare }: Props) {
  return (
    <HeaderBar
      title={product.name}
      onBack={onClose}
      backIcon={<X color={colors.navIcon} size={COMPACT_ICON} strokeWidth={2} />}
      endAction={
        <CircleButton
          onPress={onShare}
          icon={<Share2 color={colors.navIcon} size={COMPACT_ICON} strokeWidth={2} />}
        />
      }
    />
  );
}
