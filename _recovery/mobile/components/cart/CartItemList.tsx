import { View } from 'react-native';
import { CartItemCard } from './CartItemCard';
import type { Product } from '../stores/types';

export type CartLine = {
  product: Product;
  quantity: number;
};

type Props = {
  lines: CartLine[];
  onIncrement: (productId: string) => void;
  /** Fired when the user taps `−`. The parent decides whether to
   *  decrement the quantity or — when quantity is 1 — open a
   *  confirmation modal and call `onRemoveLine` after approval. */
  onDecrement: (productId: string) => void;
};

/**
 * Stacked list of cart lines. A thin wrapper over `CartItemCard`
 * that applies the vertical gap between rows. Renders nothing
 * when the list is empty — the parent screen is responsible for
 * showing the empty state instead.
 */
export function CartItemList({ lines, onIncrement, onDecrement }: Props) {
  if (lines.length === 0) return null;
  return (
    <View style={{ gap: 12 }}>
      {lines.map((line) => (
        <CartItemCard
          key={line.product.id}
          product={line.product}
          quantity={line.quantity}
          onIncrement={() => onIncrement(line.product.id)}
          onDecrement={() => onDecrement(line.product.id)}
        />
      ))}
    </View>
  );
}
