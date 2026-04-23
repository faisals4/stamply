import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { colors } from '../../../lib/colors';
import { Price } from './Price';

type Props = {
  /** Total number of items currently in the cart. When 0 the whole
   *  bar is hidden — there is no "empty" variant. */
  cartCount: number;
  /** Total price of items in the cart, in SAR. */
  cartTotal: number;
};

/**
 * Sticky "view cart" CTA anchored to the bottom of the detail
 * screen. Hidden entirely when the cart is empty — it only mounts
 * once the user adds at least one product.
 *
 * Visual language: Stamply brand-blue fill, white text, white
 * Riyal glyph. The count badge on the inline-start side uses a
 * slightly darker blue (`brand.700`) so it reads as "same color
 * family, one step deeper" against the main pill body.
 *
 * Logical layout (same JSX order in both locales):
 *
 *   [ count badge   عرض السلة ]         [ total price ]
 *                  ^ inline-start                 ^ inline-end
 *
 * In RTL: count + text on the right, price on the left.
 * In LTR: count + text on the left, price on the right.
 *
 * The whole bar is a single Pressable — future cart screen will
 * hang off the onPress handler. For now it's a no-op.
 */
export function BottomCartBar({ cartCount, cartTotal }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  if (cartCount <= 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/cart')}
      className="absolute bottom-0 start-0 end-0 mx-4 mb-4 rounded-2xl px-4"
      style={{
        backgroundColor: colors.brand.DEFAULT,
        paddingVertical: 14,
      }}
    >
      <View className="flex-row items-center justify-between">
        {/* Inline-start cluster: count badge + CTA label. */}
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View
            className="items-center justify-center rounded-md"
            style={{
              width: 24,
              height: 24,
              backgroundColor: colors.brand[700],
            }}
          >
            <Text className="text-xs text-white">{cartCount}</Text>
          </View>
          <Text style={localeDirStyle} className="text-sm text-white">
            {t('store_detail.view_cart')}
          </Text>
        </View>

        {/* Inline-end: total price with white Riyal glyph. */}
        <Price amount={cartTotal} size={14} color={colors.white} />
      </View>
    </Pressable>
  );
}
