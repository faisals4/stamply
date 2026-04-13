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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live filter
  const visible = STORES.filter((s) =>
    search.trim() === '' ? true : s.name.includes(search.trim())
  );

  // Filtered results for the search modal — show all when empty query so user can browse
  const searchResults = STORES.filter((s) =>
    searchQuery.trim() === ''
      ? true
      : s.name.includes(searchQuery.trim()) ||
        s.categories.some((c) => c.includes(searchQuery.trim()))
  );

  const localeDirStyle = useLocaleDirStyle();

  const handleSelectFromSearch = (store: Store) => {
    setSearchOpen(false);
    setSearch(store.name);
    router.push(`/stores/${store.id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScreenContainer>
        <PageHeader title={t('stores.title')} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Search trigger — opens SearchModal */}
          <Pressable
            onPress={() => setSearchOpen(true)}
            className={`mx-4 mb-4 flex-row items-center ${surfaces.card} px-4 py-3`}
          >
            <Search color={colors.ink.tertiary} size={18} strokeWidth={1.6} />
            <Text className="ms-3 flex-1 text-start text-sm text-gray-400">
              {search || t('stores.search_placeholder')}
            </Text>
          </Pressable>

          {/* Search modal */}
          <SearchModal
            visible={searchOpen}
            onClose={() => setSearchOpen(false)}
            placeholder={t('stores.search_placeholder')}
            onSearch={setSearchQuery}
            items={searchResults}
            keyExtractor={(s) => String(s.id)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectFromSearch(item)}
                className={`flex-row items-center ${surfaces.card} mb-2 px-4 py-3`}
                style={{ gap: 12 }}
              >
                {/* Store logo */}
                {item.logoUrl ? (
                  <Image source={{ uri: item.logoUrl }} style={{ width: 40, height: 40, borderRadius: 12 }} />
                ) : (
                  <View className="items-center justify-center rounded-xl" style={{ width: 40, height: 40, backgroundColor: item.logoColor }}>
                    <Text className="text-xs font-bold text-white">{item.logoLabel}</Text>
                  </View>
                )}
                {/* Info */}
                <View className="flex-1" style={{ gap: 2 }}>
                  <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">{item.name}</Text>
                  <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">{item.categories?.join('، ')}</Text>
                </View>
                {/* Distance */}
                <View className="flex-row items-center" style={{ gap: 2 }}>
                  <MapPin color={colors.ink.tertiary} size={12} strokeWidth={1.5} />
                  <Text className="text-3xs text-gray-400">{item.distanceKm} {t('stores.km')}</Text>
                </View>
              </Pressable>
            )}
            emptyText={t('stores.no_results')}
          />

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
              const open = () => router.push(`/stores/${store.id}`);
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
