import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Archive } from 'lucide-react-native';
import { api, CardFull, Tenant } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { colors } from '../lib/colors';
import { surfaces } from '../lib/surfaces';
import { HeaderBar } from '../components/ui/HeaderBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { CardVisual } from '../components/cards/CardVisual';
import { useLocaleDirStyle } from '../lib/useLocaleDirStyle';

/**
 * /archived-cards — lists every card the customer has hidden from
 * the home screen. Each card shows a compact CardVisual + a
 * "Restore Card" button. Restoring invalidates both the home
 * `cards` query and the `archivedCards` query so both lists update
 * instantly.
 */
export default function ArchivedCardsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const localeDirStyle = useLocaleDirStyle();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.archivedCards(),
    queryFn: () => api.archivedCards(),
  });

  const flatCards: { card: CardFull; tenant: Tenant | null }[] =
    (data?.data ?? []).flatMap((g) =>
      g.cards.map((c) => ({ card: c, tenant: g.tenant })),
    );

  const unarchive = useMutation({
    mutationFn: (serial: string) => api.unarchiveCard(serial),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cards() });
      qc.invalidateQueries({ queryKey: queryKeys.archivedCards() });
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <HeaderBar
          title={t('cards.archived_cards_title')}
          onBack={() => router.back()}
        />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : flatCards.length === 0 ? (
          <EmptyState
            title={t('cards.archived_cards_empty')}
            subtitle={t('cards.archived_cards_empty_subtitle')}
          />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 32,
              gap: 16,
            }}
          >
            {flatCards.map(({ card, tenant }) => (
              <View key={card.serial}>
                <CardVisual
                  design={card.design}
                  title={card.name ?? tenant?.name ?? ''}
                  collectedStamps={card.stamps_count}
                  customerName=""
                  serial={card.serial}
                  brandLogoUrl={tenant?.logo_url ?? null}
                  compact
                />

                <Pressable
                  onPress={() => unarchive.mutate(card.serial)}
                  disabled={unarchive.isPending}
                  style={{
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    opacity: unarchive.isPending ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={[localeDirStyle, { fontSize: 14, color: colors.brand.DEFAULT }]}
                  >
                    {t('cards.unarchive_card')}
                  </Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}
