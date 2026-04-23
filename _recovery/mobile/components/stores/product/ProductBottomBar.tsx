import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../lib/colors';
import { QuantityControl } from '../detail/QuantityControl';
import { Price } from '../detail/Price';

type Props = {
  /** Current quantity picked by the shopper. `null` disables the
   *  control (used when `hideQuantityControl` is set on the
   *  product). */
  quantity: number;
  onQuantityChange: (next: number) => void;
  showQuantity: boolean;

  /** Total price of the product + addon surcharges, before
   *  multiplying by quantity. `null` hides the price inside the
   *  Add button (used for gift/reward products). */
  unitPrice: number;
  showPriceInButton: boolean;

  /** Whether the Add button is currently firing. Shows a spinner
   *  instead of the label during the in-flight window. */
  loading?: boolean;
  /** When true, the Add button is replaced with a "Sold out" label
   *  and disabled. */
  soldOut?: boolean;
  onAdd: () => void;
};

/**
 * Sticky bottom bar for the product detail screen. Two columns:
 *
 *   [ QuantityControl ]     [  Add         N ر.س  ]
 *                                ^ flex-1 button
 *
 * The QuantityControl is hidden when `showQuantity === false` so
 * one-tap products (gifts, rewards) can collapse to a full-width
 * Add button. The price inside the Add button is likewise hidden
 * when `showPriceInButton === false`.
 *
 * Visual sizing rules (must stay in lockstep):
 *   - Quantity control and Add button share the SAME outer height
 *     (`BUTTON_HEIGHT = 48`) so the two sit on a perfectly
 *     straight baseline.
 *   - Both use the SAME border radius (`BUTTON_RADIUS = 16`,
 *     i.e. `rounded-2xl`) so the left edge of the pill and the
 *     right edge of the Add button mirror each other visually.
 *   - At quantity === 1 the minus button renders DISABLED (grayed
 *     out, non-interactive) instead of the trash icon. The
 *     product detail screen enforces a minimum order quantity of
 *     1, so dropping to zero isn't meaningful here — disabling
 *     the minus communicates the floor better than a trash.
 *
 * Stateless — quantity and loading are lifted to the parent
 * screen which owns the cart wiring.
 */
const BUTTON_HEIGHT = 48;
const BUTTON_RADIUS = 16;

export function ProductBottomBar({
  quantity,
  onQuantityChange,
  showQuantity,
  unitPrice,
  showPriceInButton,
  loading = false,
  soldOut = false,
  onAdd,
}: Props) {
  const { t } = useTranslation();
  const total = unitPrice * Math.max(1, quantity);

  return (
    <View
      className="absolute bottom-0 start-0 end-0 flex-row items-center border-t border-gray-200 px-4"
      style={[
        {
          paddingTop: 12,
          paddingBottom: 20,
          gap: 8,
          backgroundColor: Platform.OS === 'web'
            ? 'rgba(255, 255, 255, 0.90)'
            : colors.page,
        },
        Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            } as any)
          : null,
      ]}
    >
      {showQuantity ? (
        <QuantityControl
          quantity={quantity}
          onAdd={() => onQuantityChange(quantity + 1)}
          onRemove={() => onQuantityChange(Math.max(1, quantity - 1))}
          size={BUTTON_HEIGHT}
          iconSize={18}
          disableRemoveAtOne
          borderRadius={BUTTON_RADIUS}
        />
      ) : null}

      <Pressable
        onPress={onAdd}
        disabled={loading || soldOut}
        className="flex-1 flex-row items-center justify-between px-4"
        style={{
          backgroundColor: colors.brand.DEFAULT,
          height: BUTTON_HEIGHT,
          borderRadius: BUTTON_RADIUS,
          opacity: soldOut ? 0.4 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : soldOut ? (
          <Text className="flex-1 text-center text-sm font-bold text-white">
            {t('product_detail.sold_out')}
          </Text>
        ) : showPriceInButton ? (
          /* Typography matches the BottomCartBar "view cart" CTA —
             plain text-sm, no bold, same white color and same
             non-bold Price component. Keeps the two primary blue
             bars visually consistent across the screen. */
          <>
            <Text className="text-sm text-white">
              {t('product_detail.add')}
            </Text>
            <Price amount={total} size={14} color={colors.white} />
          </>
        ) : (
          <Text className="flex-1 text-center text-sm text-white">
            {t('product_detail.add')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
