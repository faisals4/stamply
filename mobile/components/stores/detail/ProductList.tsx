import { View } from 'react-native';
import { ProductListCard } from './ProductListCard';
import type { MenuSection } from '../types';

type Props = {
  section: MenuSection;
  /** Parent-owned cart map. Threaded through to each list card so
   *  the add/remove buttons can drive the parent screen's state. */
  cart: Record<string, number>;
  onAdd: (productId: string) => void;
  onRemove: (productId: string) => void;
  /** Open the product detail screen for a given product id. */
  onProductPress?: (productId: string) => void;
};

/**
 * Vertical list layout used by every menu section except "الأكثر
 * مبيعًا". Each product renders as a full-width row via
 * `ProductListCard` with a hairline divider between rows.
 *
 * The divider is a `border-t` on every card after the first so the
 * top of the first row butts cleanly against the section header
 * above it.
 */
export function ProductList({
  section,
  cart,
  onAdd,
  onRemove,
  onProductPress,
}: Props) {
  return (
    <View>
      {section.products.map((product, i) => (
        <View
          key={product.id}
          className={i > 0 ? 'border-t border-gray-100' : undefined}
        >
          <ProductListCard
            product={product}
            quantity={cart[product.id] ?? 0}
            onAdd={() => onAdd(product.id)}
            onRemove={() => onRemove(product.id)}
            onPress={() => onProductPress?.(product.id)}
          />
        </View>
      ))}
    </View>
  );
}
