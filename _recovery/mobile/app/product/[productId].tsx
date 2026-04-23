import { useLocalSearchParams } from 'expo-router';
import { ProductDetailScreen } from '../../components/stores/product/ProductDetailScreen';
import { STORES } from '../../components/stores/data';
import type { Product, Store } from '../../components/stores/types';

/**
 * Expo Router flat route for `/product/:productId`.
 *
 * Looks up the product across every merchant's menu sections,
 * then hands off to `ProductDetailScreen` along with a list of
 * cross-sell products from the same merchant.
 *
 * Cross-sell resolution — two tiers:
 *
 *   1. If the product has an explicit `crossSellIds` list, resolve
 *      each id against the owning merchant's full product pool
 *      (across ALL menu sections, not just the one the product
 *      lives in). Preserves the order the author specified.
 *
 *   2. Otherwise, fall back to the sibling products in the same
 *      menu section, minus the current product. This keeps the
 *      scroller populated for products that don't explicitly
 *      curate their cross-sells.
 *
 * In the real backend this will be replaced with a React Query
 * hook fetching the product by id + its cross-sell refs from the
 * API.
 */
export default function ProductDetailRoute() {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  let owningStore: Store | undefined;
  let owningSiblings: Product[] = [];
  let foundProduct: Product | undefined;

  outer: for (const store of STORES) {
    for (const section of store.menuSections ?? []) {
      for (const product of section.products) {
        if (product.id === productId) {
          foundProduct = product;
          owningStore = store;
          owningSiblings = section.products;
          break outer;
        }
      }
    }
  }

  if (!foundProduct || !owningStore) {
    // Graceful fallback for unknown ids during mock-data dev.
    const fallbackStore = STORES[0];
    const fallbackSection = fallbackStore.menuSections?.[0];
    foundProduct = fallbackSection?.products[0];
    owningStore = fallbackStore;
    owningSiblings = fallbackSection?.products ?? [];
  }

  if (!foundProduct) return null;

  // Collapse every product from every section of the owning store
  // into a flat pool, keyed by id, so `crossSellIds` can pull from
  // across sections (e.g. a coffee cross-selling with a dessert).
  const storePool: Record<string, Product> = {};
  for (const section of owningStore.menuSections ?? []) {
    for (const product of section.products) {
      storePool[product.id] = product;
    }
  }

  let crossSellProducts: Product[];
  if (foundProduct.crossSellIds && foundProduct.crossSellIds.length > 0) {
    crossSellProducts = foundProduct.crossSellIds
      .map((id) => storePool[id])
      .filter((p): p is Product => !!p && p.id !== foundProduct!.id);
  } else {
    crossSellProducts = owningSiblings.filter((p) => p.id !== foundProduct!.id);
  }

  return (
    <ProductDetailScreen
      product={foundProduct}
      crossSellProducts={crossSellProducts}
    />
  );
}
