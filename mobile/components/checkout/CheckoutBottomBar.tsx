import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../lib/colors';
import { Price } from '../stores/detail/Price';

type Props = {
  total: number;
  loading?: boolean;
  onConfirm: () => void;
};

/**
 * Sticky checkout CTA at the bottom of the screen. A single
 * full-width button in Stamply brand blue with the label
 * "تأكيد الطلب" inline with the total price on the end side.
 *
 * Rendered as an `absolute` sibling of the ScrollView inside the
 * checkout screen's `ScreenContainer`, so the absolute insets
 * clamp to the 440 px column on desktop instead of spanning the
 * whole viewport — same pattern as `CartBottomBar`.
 *
 * Typography matches the `BottomCartBar` "view cart" and the
 * `ProductBottomBar` "Add" CTAs: plain `text-sm`, no bold, same
 * white color, same non-bold `Price` component. Keeps the three
 * primary-blue bars across the app visually consistent.
 */
export function CheckoutBottomBar({ total, loading = false, onConfirm }: Props) {
  const { t } = useTranslation();

  return (
    <View
      className="absolute bottom-0 start-0 end-0 border-t border-gray-200 px-4"
      style={[
        {
          paddingTop: 12,
          paddingBottom: 20,
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
        onPress={onConfirm}
        disabled={loading}
        className="flex-row items-center justify-between rounded-2xl px-4"
        style={{
          backgroundColor: colors.brand.DEFAULT,
          height: 48,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Text className="text-sm text-white">
              {t('checkout.confirm_cta')}
            </Text>
            <Price amount={total} size={14} color={colors.white} />
          </>
        )}
      </Pressable>
    </View>
  );
}
