import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../lib/colors';

type Props = {
  /** Pill size. `sm` is tight enough for inline addon rows; `md` is
   *  the hero-overlay size used on product detail covers. */
  size?: 'sm' | 'md';
};

/**
 * Red "نفذت الكمية" / "Sold out" badge.
 *
 * Single source of truth for the "out of stock" signal across every
 * Stamply surface — addon option rows inside the product detail
 * screen, sold-out product cards on store menus, and the hero
 * overlay on the product detail page. Any new sold-out label should
 * render this component instead of hand-rolling a red pill.
 *
 * `self-center` pins the pill to its content width and centers it
 * horizontally inside its flex parent, so dropping it into any
 * column layout (as a sibling above an item name, or as an overlay
 * on a hero image) just works in both RTL and LTR without needing
 * the call site to wrap it in an `items-center` container.
 */
export function SoldOutBadge({ size = 'sm' }: Props) {
  const { t } = useTranslation();
  const isSmall = size === 'sm';

  return (
    <View
      className={
        isSmall
          ? 'self-center rounded-full px-2 py-0.5'
          : 'self-center rounded-full px-4 py-1.5'
      }
      style={{ backgroundColor: colors.state.danger }}
    >
      <Text
        className={
          isSmall ? 'text-3xs font-bold text-white' : 'text-xs font-bold text-white'
        }
      >
        {t('product_detail.sold_out')}
      </Text>
    </View>
  );
}
