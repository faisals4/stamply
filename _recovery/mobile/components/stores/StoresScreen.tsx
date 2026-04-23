import { useState } from 'react';
import { View, ScrollView, Pressable, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Search, MapPin } from 'lucide-react-native';
import { ScreenContainer } from '../ScreenContainer';
import { PageHeader } from '../PageHeader';
import { SearchModal } from '../ui/SearchModal';
import { STORES, CATEGORIES } from './data';
import { CategoryChips } from './CategoryChips';
import { StoresSectionHeader } from './StoresSectionHeader';
import { StoreCard } from './StoreCard';
import { StoreRow } from './StoreRow';
import type { StoresViewMode } from './types';
import type { Store } from './types';
import { colors } from '../../lib/colors';
import { surfaces } from '../../lib/surfaces';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';

/**
 * "أطلب الآن" / "Order now" — static directory of Stamply merchants
 * for the customer app. Shows hardcoded example data so we can iron
 * out the visual + interaction shape before wiring up a real
 * `/api/app/stores` endpoint.
 *
 * This file owns all of the screen state (search query, active
 * category, view mode) and composes the rest of the components in
 * `components/stores/`. Every part is split into its own file so
 * the layout can grow without turning into a 400-line monolith.
 *
 * Visual language follows the rest of the customer app: brand blue
 * (#003BC0) for the active chip and the delivery badge, gray-50
 * page background, rounded-2xl cards with a gray-200 border, and
 * lucide icons at strokeWidth ~1.5–2 to match the bottom tab bar.
 */
export function StoresScreen() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const [view, setView] = useState<StoresViewMode>('grid');
  const [search, setSearch] = useState('');

  // Live filter — only the search query is wired up; the category
  // chips are visual-only until we have real category metadata on
  // each store. The "كل المتاجر" chip is the no-op default.
  const visible = STORES.filter((s) =>
    search.trim() === '' ? true : s.name.includes(search.trim())
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScreenContainer>
        <PageHeader title={t('stores.title')} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <StoresSearchBar value={search} onChange={setSearch} />

          <CategoryChips
            categories={CATEGORIES}
            active={activeCategory}
            onSelect={setActiveCategory}
          />

          <StoresSectionHeader view={view} onChangeView={setView} />

          {/* Store list — the section header's view toggle swaps
              between the rich `StoreCard` (grid) and the compact
              `StoreRow` (list). Gap shrinks in list mode since rows
              already read as tightly packed list items.

              Every card/row navigates to `/stores/:id` on press. The
              detail screen renders the full merchant page (hero, info
              card, stats, promos, menu sections). Only STORES[0] has
              full detail-tier mock data — the route falls back to it
              for every other merchant. */}
          <View className="px-4" style={{ gap: view === 'grid' ? 16 : 8 }}>
            {visible.map((store) => {
              const open = () => router.push(`/shop/${store.id}`);
              return view === 'grid' ? (
                <StoreCard key={store.id} store={store} onPress={open} />
              ) : (
                <StoreRow key={store.id} store={store} onPress={open} />
              );
            })}
          </View>
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
