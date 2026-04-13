import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Link2, ExternalLink, CreditCard } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { IconButton } from '../../components/ui/IconButton';
import { surfaces } from '../../lib/surfaces';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { LoadingState } from '../../components/LoadingState';
import { StatusBadge } from '../../components/StatusBadge';
import { DeleteButton } from '../../components/DeleteButton';
import { CardVisual } from '../../components/cards/CardVisual';
import { merchantApi } from '../lib/merchant-auth';
import { fromApi, type CardTemplate } from '../lib/card-types';
import { useMerchantDrawer } from '../components/MerchantSideDrawer';

export function MerchantCardsScreen() {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const queryClient = useQueryClient();
  const { menuButton, drawer } = useMerchantDrawer('cards');

  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['merchant', 'cards'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await merchantApi.listCards(pageParam);
      return { data: res.data.map(fromApi), meta: res.meta };
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta && lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
    initialPageParam: 1,
  });
  const cards = infiniteData?.pages.flatMap((p) => p.data) ?? [];

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      setDeletingId(id);
      return merchantApi.deleteCard(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'cards'] });
      setDeletingId(null);
    },
    onError: () => setDeletingId(null),
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-page">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <HeaderBar
          title={t('merchant.cards_page_title')}
          onBack={() => router.back()}
          endAction={menuButton}
        />

        {isLoading ? (
          <LoadingState />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, gap: 16 }}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            scrollEventThrottle={400}
          >
            {/* Page title + subtitle */}
            <View style={{ gap: 4 }}>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <CreditCard
                  color={colors.ink.primary}
                  size={24}
                  strokeWidth={1.5}
                />
                <Text
                  style={localeDirStyle}
                  className="text-start text-xl font-bold text-gray-900"
                >
                  {t('merchant.cards_page_title')}
                </Text>
              </View>
              <Text
                style={localeDirStyle}
                className="text-start text-xs text-gray-400"
              >
                {t('merchant.cards_page_subtitle')}
              </Text>
            </View>

            {/* Create button */}
            <PrimaryButton
              label={t('merchant.create_card')}
              onPress={() => router.push('/merchant-card-editor' as any)}
              icon={<Plus color="#FFFFFF" size={18} strokeWidth={2} />}
            />

            {/* Cards list */}
            {cards && cards.length > 0 ? (
              cards.map((card) => (
                <CardListItem
                  key={card.id}
                  card={card}
                  onEdit={() =>
                    router.push(
                      `/merchant-card-editor?id=${card.id}` as any,
                    )
                  }
                  onDelete={() => deleteMutation.mutate(card.id)}
                  deleteLoading={deleteMutation.isPending}
                />
              ))
            ) : (
              <View
                className="items-center py-12"
                style={{ gap: 8 }}
              >
                <CreditCard
                  color={colors.ink.tertiary}
                  size={40}
                  strokeWidth={1}
                />
                <Text
                  style={localeDirStyle}
                  className="text-center text-sm text-gray-400"
                >
                  {t('merchant.cards_empty')}
                </Text>
              </View>
            )}
            {isFetchingNextPage && (
              <View className="items-center py-4">
                <ActivityIndicator color={colors.brand.DEFAULT} size="small" />
              </View>
            )}
          </ScrollView>
        )}
      </ScreenContainer>
      {drawer}
    </SafeAreaView>
  );
}

/* ─── Card list item — uses the shared CardVisual component ─── */

function CardListItem({
  card,
  onEdit,
  onDelete,
  deleteLoading = false,
}: {
  card: CardTemplate;
  onEdit: () => void;
  onDelete: () => void;
  deleteLoading?: boolean;
}) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View className={`overflow-hidden ${surfaces.card}`}>
      {/* Header: name + badges (inline-start) — delete (inline-end).
          Matches the web dashboard card list layout. */}
      <View
        className="flex-row items-center justify-between px-4 pt-4"
        style={{ gap: 12 }}
      >
        <View className="flex-1" style={{ gap: 4 }}>
          <Text
            style={localeDirStyle}
            className="text-start text-sm font-bold text-gray-900"
            numberOfLines={1}
          >
            {card.name}
          </Text>
          <View className="flex-row" style={{ gap: 6 }}>
            <StatusBadge
              label={
                card.status === 'active'
                  ? t('merchant.status_active')
                  : t('merchant.status_draft')
              }
              variant={card.status === 'active' ? 'success' : 'neutral'}
            />
            <StatusBadge
              label={t('merchant.card_type_stamp')}
              variant="neutral"
            />
          </View>
        </View>
        <DeleteButton
          title={t('merchant.delete_card_title')}
          message={t('merchant.delete_card_message', { name: card.name })}
          onConfirm={onDelete}
          loading={deleteLoading}
        />
      </View>

      {/* Real CardVisual preview — same component used in cards tab,
          loyalty stores, card detail sheet, etc. Renders the actual
          stamp grid with the merchant's design colors + icons. */}
      <View className="mx-4 mt-3">
        <CardVisual
          design={card.design}
          title={card.name}
          collectedStamps={0}
          customerName=""
          serial={`tpl-${card.id}`}
          stampsRequired={card.rewards[0]?.stampsRequired}
          compact
        />
      </View>

      {/* Footer: stamps count + actions */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text
          style={localeDirStyle}
          className="text-start text-2xs text-gray-400"
        >
          {card.design.stampsCount} {t('merchant.stamps_label')}
        </Text>
        <View className="flex-row" style={{ gap: 8 }}>
          <IconButton icon={ExternalLink} onPress={() => {
            if (!card.publicSlug) return;
            const origin = Platform.OS === 'web' && typeof window !== 'undefined'
              ? window.location.origin
              : 'https://stamply.ngrok.app';
            const url = `${origin}/c/${card.publicSlug}`;
            if (Platform.OS === 'web') {
              window.location.href = url;
            } else {
              Linking.openURL(url);
            }
          }} disabled={!card.publicSlug} />
          <IconButton icon={Pencil} onPress={onEdit} />
        </View>
      </View>
    </View>
  );
}
