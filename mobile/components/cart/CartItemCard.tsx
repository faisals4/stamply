import { View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { QuantityControl } from '../stores/detail/QuantityControl';
import { Price } from '../stores/detail/Price';
import type { Product } from '../stores/types';

type Props = {
  product: Product;
  quantity: number;
  /** Increment quantity by one. */
  onIncrement: () => void;
  /** Decrement quantity by one. When the current quantity is 1,
   *  the parent should open a confirmation dialog instead of
   *  silently removing the line — this component does NOT show
   *  its own confirm modal. */
  onDecrement: () => void;
};

/**
 * Single cart line — a bordered row with a product thumbnail,
 * the name + quantity hint + per-unit price + total price, and
 * a `QuantityControl` at the inline-end edge.
 *
 * Logical layout (same JSX order in both locales):
 *
 *   [ image 64×64 ]  [ name + meta ]  [ price ]   [ qty control ]
 *
 * Mirrors `cart-item-card.tsx` in orders4 but uses Stamply's
 * design tokens (Price with Riyal glyph, light gray surfaces,
 * brand blue rather than red).
 */
export function CartItemCard({
  product,
  quantity,
  onIncrement,
  onDecrement,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  const unitPrice = product.discountPrice ?? product.price;
  const totalPrice = unitPrice * quantity;

  return (
    <View
      className="mx-4 flex-row items-start rounded-2xl border border-gray-200 bg-white p-3"
      style={{ gap: 12 }}
    >
      <Image
        source={{ uri: product.image }}
        style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#F3F4F6' }}
        resizeMode="cover"
      />

      {/* Middle column — name + quantity + per-unit price hint. */}
      <View className="flex-1">
        <Text
          style={localeDirStyle}
          className="text-start text-sm font-bold text-gray-900"
          numberOfLines={1}
        >
          {product.name}
        </Text>
        <Text
          style={localeDirStyle}
          className="mt-0.5 text-start text-xs text-gray-500"
        >
          {t('cart.quantity_label')}: {quantity}
        </Text>
        {quantity >= 2 ? (
          <View
            className="mt-0.5 flex-row items-center"
            style={{ gap: 4 }}
          >
            <Text
              style={localeDirStyle}
              className="text-start text-xs text-gray-500"
            >
              {t('cart.each_label')}:
            </Text>
            <Price amount={unitPrice} size={12} />
          </View>
        ) : null}
      </View>

      {/* Right column — total price stacked above the qty control.
          `items-end` keeps the price number aligned to the inline-
          end edge (left in RTL, right in LTR). */}
      <View className="items-end" style={{ gap: 8 }}>
        <Price amount={totalPrice} size={13} bold />
        <QuantityControl
          quantity={quantity}
          onAdd={onIncrement}
          onRemove={onDecrement}
          size={36}
          iconSize={14}
        />
      </View>
    </View>
  );
}
