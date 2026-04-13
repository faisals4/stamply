import { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { colors } from '../lib/colors';
import { surfaces } from '../lib/surfaces';
import { shadows } from '../lib/shadows';
import { ScreenContainer } from '../components/ScreenContainer';
import { HeaderBar } from '../components/ui/HeaderBar';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['favorites'],
    queryFn: async ({ pageParam = 1 }) => api.favorites(pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
    initialPageParam: 1,
  });
  const data = infiniteData?.pages.flatMap((p) => p.data) ?? [];

  const [removing, setRemoving] = useState<number | null>(null);
  const animRefs = useRef<Map<number, Animated.Value>>(new Map());

  const getAnim = (id: number) => {
    if (!animRefs.current.has(id)) animRefs.current.set(id, new Animated.Value(1));
    return animRefs.current.get(id)!;
  };

  const handleRemove = async (tenantId: number) => {
    setRemoving(tenantId);
    // Animate out: fade + shrink
    const anim = getAnim(tenantId);
    Animated.timing(anim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(async () => {
      // Remove from cache after animation
      queryClient.setQueryData(['favorites'], (old: any) => {
        if (!old?.pages) return old;
        return { ...old, pages: old.pages.map((p: any) => ({ ...p, data: p.data.filter((s: any) => s.id !== tenantId) })) };
      });
      setRemoving(null);
      try {
        await api.removeFavorite(tenantId);
        queryClient.invalidateQueries({ queryKey: ['discover-tenants'] });
      } catch {
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <HeaderBar title={t('favorites.title')} onBack={() => router.back()} />

        {isLoading ? (
          <LoadingState />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={t('favorites.empty_title')}
            subtitle={t('favorites.empty_subtitle')}
          />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 10 }}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            scrollEventThrottle={400}
          >
            {data.map((store) => (
              <Animated.View
                key={store.id}
                style={{ opacity: getAnim(store.id), transform: [{ scale: getAnim(store.id) }] }}
              >
              <Pressable
                onPress={() => router.push(`/loyalty-stores?tenantId=${store.id}` as any)}
                className={`flex-row items-center ${surfaces.card} p-3`}
                style={[shadows.card, { gap: 12 }]}
              >
                {store.logo_url ? (
                  <Image
                    source={{ uri: store.logo_url }}
                    style={{ width: 60, height: 60, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    className="items-center justify-center rounded-xl"
                    style={{ width: 60, height: 60, backgroundColor: colors.ink.secondary }}
                  >
                    <Text className="font-bold text-white" style={{ fontSize: 12 }}>{store.name.charAt(0)}</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{store.name}</Text>
                  {store.description ? (
                    <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={1}>{store.description}</Text>
                  ) : null}
                  <Text className="mt-0.5 text-3xs text-gray-400">
                    {t('cards.loyalty_stores_count', { count: store.active_cards_count })}
                  </Text>
                </View>
                <FavoriteButton
                  isFavorite={removing !== store.id}
                  onToggle={() => handleRemove(store.id)}
                />
              </Pressable>
              </Animated.View>
            ))}
            {isFetchingNextPage && (
              <View className="items-center py-4">
                <ActivityIndicator color={colors.brand.DEFAULT} size="small" />
              </View>
            )}
          </ScrollView>
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}
