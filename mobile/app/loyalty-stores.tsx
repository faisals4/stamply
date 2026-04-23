import { View, Text, ScrollView, ActivityIndicator, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { colors } from '../lib/colors';
import { shadows } from '../lib/shadows';
import { surfaces } from '../lib/surfaces';
import { useIsRTL } from '../lib/rtl';
import { ScreenContainer } from '../components/ScreenContainer';

/**
 * Loyalty Stores screen — shows every merchant from the Stamply
 * platform that the customer has at least one active loyalty card
 * with. Data comes from the real `/api/app/cards` endpoint (the
 * same one powering the Cards tab), grouped by tenant.
 *
 * Each row shows the merchant logo, name, and the number of active
 * cards the customer holds with that merchant. Tapping a row
 * navigates back to the Cards tab (future: could deep-link to that
 * merchant's cards filtered).
 *
 * Accessed via the "المتاجر — تدعم بطاقات الولاء" button on the
 * Cards tab header. Has a back button to return to Cards.
 */
export default function LoyaltyStoresScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => (await api.cards()).data,
  });

  // Each group = one merchant (tenant) with 1+ active cards.
  const groups = data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-page">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        {/* Header with back button */}
        <View
          className="flex-row items-center px-4 pb-3 pt-2"
          style={{ gap: 12 }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <BackIcon color={colors.ink.primary} size={24} strokeWidth={2} />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-gray-900">
            {t('cards.loyalty_stores_title')}
          </Text>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
          </View>
        ) : groups.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="mb-2 text-lg font-bold text-gray-900">
              {t('cards.empty_title')}
            </Text>
            <Text className="text-center text-sm leading-6 text-gray-500">
              {t('cards.empty_subtitle')}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 32,
              gap: 10,
            }}
            showsVerticalScrollIndicator={false}
          >
            {groups.map((group) => {
              const tenant = group.tenant;
              if (!tenant) return null;
              const cardCount = group.cards.length;

              return (
                <Pressable
                  key={tenant.id}
                  onPress={() => router.back()}
                  className={`flex-row items-center ${surfaces.card} p-3`}
                  style={[shadows.card, { gap: 12 }]}
                >
                  {/* Merchant logo */}
                  {tenant.logo_url ? (
                    <Image
                      source={{ uri: tenant.logo_url }}
                      style={{ width: 48, height: 48, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      className="items-center justify-center rounded-xl"
                      style={{
                        width: 48,
                        height: 48,
                        backgroundColor: tenant.brand_color ?? colors.ink.secondary,
                      }}
                    >
                      <Text
                        className="font-bold text-white"
                        style={{ fontSize: 12 }}
                        numberOfLines={1}
                      >
                        {tenant.name.charAt(0)}
                      </Text>
                    </View>
                  )}

                  {/* Name + card count */}
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                      {tenant.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-gray-500">
                      {t('cards.loyalty_stores_count', { count: cardCount })}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}
