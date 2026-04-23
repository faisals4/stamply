import { View, useWindowDimensions } from 'react-native';
import { ProductGridCard } from './ProductGridCard';
import type { MenuSection } from '../types';

const HORIZONTAL_PADDING = 16; // mx-4
const COLUMN_GAP = 12;
const MAX_SCREEN_WIDTH = 440; // keep in sync with ScreenContainer

type Props = {
  section: MenuSection;
  /** Parent-owned cart map. Read-only inside the grid — mutations
   *  flow back up through `onAdd`/`onRemove`. */
  cart: Record<string, number>;
  onAdd: (productId: string) => void;
  onRemove: (productId: string) => void;
  /** Open the product detail screen for a given product id. */
  onProductPress?: (productId: string) => void;
};

/**
 * Two-column grid layout used for the "الأكثر مبيعًا" hero section.
 * Computes the card width once from the container dimensions so the
 * two columns share the available width minus the outer padding
 * and the inter-column gap, and passes the fixed width down to each
 * `ProductGridCard` (which needs an explicit width to render a
 * square tile with a precisely-centered product image).
 *
 * On desktop the parent `ScreenContainer` clamps the whole screen
 * to a 440px-wide column, but `useWindowDimensions()` still returns
 * the full viewport width — so we clamp `screenWidth` to the same
 * 440 max here, otherwise the two grid cards would each be 1000+ px
 * wide on a desktop browser and overflow the column.
 *
 * The cart map and the two mutation handlers are threaded through
 * to each card so the add/remove buttons inside the cards can
 * drive the parent screen's cart state without ever touching
 * context or global state.
 *
 * All other sections use `ProductList` instead — this component is
 * intentionally the only path that renders the grid layout.
 */
export function ProductGrid({
  section,
  cart,
  onAdd,
  onRemove,
  onProductPress,
}: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const containerWidth = Math.min(viewportWidth, MAX_SCREEN_WIDTH);
  const cardWidth =
    (containerWidth - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;

  return (
    <View
      className="px-4 pt-4"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: COLUMN_GAP,
      }}
    >
      {section.products.map((product) => (
        <ProductGridCard
          key={product.id}
          product={product}
          width={cardWidth}
          quantity={cart[product.id] ?? 0}
          onAdd={() => onAdd(product.id)}
          onRemove={() => onRemove(product.id)}
          onPress={() => onProductPress?.(product.id)}
        />
      ))}
    </View>
  );
}
