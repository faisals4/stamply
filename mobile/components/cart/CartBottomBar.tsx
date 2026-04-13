import { View, Text, Pressable, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../lib/colors';

type Props = {
  onAddMore: () => void;
  onCheckout: () => void;
};

/**
 * Sticky bottom bar for the cart screen — two buttons side by
 * side:
 *
 *   [  أضف المزيد (outline)  ]  [  المتابعة للدفع (brand)  ]
 *
 * Rendered as an `absolute` sibling of the ScrollView inside the
 * cart screen's `ScreenContainer`, so the absolute insets clamp
 * to the 440 px column on desktop instead of spanning the whole
 * viewport.
 *
 * Typography matches the BottomCartBar "view cart" CTA — plain
 * `text-sm`, no bold — so the three primary blue CTAs across
 * the app feel consistent.
 */
export function CartBottomBar({ onAddMore, onCheckout }: Props) {
  const { t } = useTranslation();

  return (
    <View
      className="absolute bottom-0 start-0 end-0 flex-row border-t border-gray-200 px-4"
      style={[
        {
          paddingTop: 12,
          paddingBottom: 20,
          gap: 10,
          backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.90)' : colors.page,
        },
        Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            } as any)
          : null,
      ]}
    >
      <Pressable
        onPress={onAddMore}
        className="flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white"
        style={{ height: 48 }}
      >
        <Text className="text-sm text-gray-900">
          {t('cart.add_more')}
        </Text>
      </Pressable>
      <Pressable
        onPress={onCheckout}
        className="flex-1 items-center justify-center rounded-2xl"
        style={{ height: 48, backgroundColor: colors.brand.DEFAULT }}
      >
        <Text className="text-sm text-white">
          {t('cart.proceed_to_checkout')}
        </Text>
      </Pressable>
    </View>
  );
}
