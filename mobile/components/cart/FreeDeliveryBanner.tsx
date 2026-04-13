import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { Price } from '../stores/detail/Price';

type Props = {
  totalPrice: number;
  /** Order minimum that unlocks free delivery, in SAR. */
  threshold?: number;
};

const PROGRESS_BAR_HEIGHT = 18;

/**
 * Progress banner shown at the top of the cart. Two states:
 *
 *   - Unlocked (`totalPrice >= threshold`): a green success
 *     headline congratulating the user.
 *   - Locked: a neutral headline + a remaining-amount hint + a
 *     horizontal progress bar filled in Stamply brand blue.
 *
 * All currency renders via `<Price>` so the Saudi Riyal glyph
 * appears next to every amount instead of literal "ر.س" text.
 */
export function FreeDeliveryBanner({ totalPrice, threshold = 150 }: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();

  const hasFreeDelivery = totalPrice >= threshold;
  const remaining = Math.max(0, threshold - totalPrice);
  const progressPercentage = Math.min(100, (totalPrice / threshold) * 100);

  return (
    <View className="mx-4 rounded-2xl border border-gray-200 bg-white p-3">
      {hasFreeDelivery ? (
        <Text
          style={[localeDirStyle, { color: colors.state.success }]}
          className="text-center text-sm font-medium"
        >
          {t('cart.free_delivery_unlocked')}
        </Text>
      ) : (
        <>
          <Text
            style={[localeDirStyle, { color: colors.state.success }]}
            className="text-center text-sm font-medium"
          >
            {t('cart.free_delivery_remaining', { amount: threshold })}
          </Text>

          {/* Remaining-amount hint with the prices pulled out as
              inline <Price> components so the Riyal glyph appears
              next to each number. `flex-wrap` lets the line break
              on narrow screens. */}
          <View
            className="mt-1 flex-row flex-wrap items-center justify-center"
            style={{ gap: 4 }}
          >
            <Text
              style={localeDirStyle}
              className="text-xs text-gray-500"
            >
              {t('cart.free_delivery_progress_total')}
            </Text>
            <Price amount={Number(totalPrice.toFixed(2))} size={12} color={colors.ink.secondary} />
            <Text style={localeDirStyle} className="text-xs text-gray-500">
              {t('cart.free_delivery_progress_remaining')}
            </Text>
            <Price amount={Number(remaining.toFixed(2))} size={12} color={colors.ink.secondary} />
          </View>

          {/* Horizontal progress bar — gray track + brand-blue
              fill. The percentage sits centered on top of the
              track so it stays readable regardless of fill width. */}
          <View
            className="mt-3 overflow-hidden rounded-full bg-gray-200"
            style={{ height: PROGRESS_BAR_HEIGHT }}
          >
            <View
              className="absolute top-0 h-full rounded-full"
              style={{
                width: `${progressPercentage}%`,
                backgroundColor: colors.brand.DEFAULT,
                [isRTL ? 'right' : 'left']: 0,
              }}
            />
            <View
              className="absolute inset-0 items-center justify-center"
              pointerEvents="none"
            >
              <Text
                className="text-3xs font-medium"
                style={{
                  color: progressPercentage >= 50 ? colors.white : colors.ink.tertiary,
                }}
              >
                {progressPercentage.toFixed(0)}%
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
