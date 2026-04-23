import { useLocalSearchParams } from 'expo-router';
import { StoreDetailScreen } from '../../components/stores/detail/StoreDetailScreen';
import { STORES } from '../../components/stores/data';

/**
 * Expo Router dynamic route for `/stores/:id`. Thin wrapper: reads
 * the id param, resolves it to a Store from the mock data, and
 * hands the Store object off to the real screen component.
 *
 * Only STORES[0] has full detail-tier mock data (menuSections,
 * promos, minOrder, etc.) populated, so tapping any other merchant
 * in the list reuses STORES[0]'s menu/promo data but keeps the
 * original merchant's identity (name, logo, cover, categories)
 * visible. This lets us demo the screen shape across the whole
 * directory without duplicating 5 menu sections × 10 merchants of
 * mock content.
 */
export default function StoreDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = STORES.find((s) => s.id === id) ?? STORES[0];

  // Every store now has its own menuSections, so just use it directly.
  const store = base;

  return <StoreDetailScreen store={store} />;
}
