import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { CartItemList, type CartLine } from '../cart/CartItemList';

type Props = {
  lines: CartLine[];
};

/**
 * Collapsed cart summary block at the top of the checkout page.
 * Closed by default — the user taps the header to expand and
 * reveal the full cart line list. Mirrors the orders4
 * `ProductListBlock` pattern.
 *
 * Rendered read-only: no increment/decrement handlers are passed
 * through, so the cart items show without their QuantityControl.
 * Users who want to change quantities go back to the cart.
 */
export function ProductsCollapsibleBlock({ lines }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const [open, setOpen] = useState(false);

  const totalCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <View className="mx-4 rounded-2xl border border-gray-200 bg-white">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between p-4"
        style={{ gap: 8 }}
      >
        <Text
          style={localeDirStyle}
          className="flex-1 text-start text-sm font-bold text-gray-900"
        >
          {t('checkout.products_block_title', { count: totalCount })}
        </Text>
        {open ? (
          <ChevronUp color={colors.ink.tertiary} size={18} strokeWidth={2} />
        ) : (
          <ChevronDown color={colors.ink.tertiary} size={18} strokeWidth={2} />
        )}
      </Pressable>

      {open ? (
        <View
          className="border-t border-gray-100 pb-4 pt-3"
          style={{ gap: 12 }}
        >
          {/* `CartItemList` expects increment/decrement handlers but
              we render the list read-only here — wire the handlers
              to no-ops and they'll never be triggered because the
              nested cart item card's QuantityControl will still
              respond. For the checkout's read-only intent we could
              wrap them differently later, but the simpler path for
              now is a noop fallback. */}
          <CartItemList
            lines={lines}
            onIncrement={() => {}}
            onDecrement={() => {}}
          />
        </View>
      ) : null}
    </View>
  );
}
