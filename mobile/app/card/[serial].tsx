import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  Pressable,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Gift } from 'lucide-react-native';
import { api, ApiError } from '../../lib/api';
import { useIsRTL } from '../../lib/rtl';
import { CardVisual } from '../../components/CardVisual';
import { PrimaryButton } from '../../components/PrimaryButton';
import { surfaces } from '../../lib/surfaces';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Single-card detail screen — shows the same card visual as the web
 * `/i/{serial}` PWA, followed by the "ready to redeem" banner, wallet
 * buttons, and the multi-reward ladder when the card has more than
 * one reward tier.
 */
export default function CardDetailScreen() {
  const { t } = useTranslation();
  const { serial } = useLocalSearchParams<{ serial: string }>();
  const [walletLoading, setWalletLoading] = useState(false);
  const isRTL = useIsRTL();
  const BackArrow = isRTL ? ChevronRight : ChevronLeft;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.card(serial!),
    queryFn: async () => (await api.cardDetail(serial!)).data,
    enabled: !!serial,
    staleTime: 15_000, // allow 15s before refetching
  });

  const addToWallet = async () => {
    if (!serial || walletLoading) return;
    setWalletLoading(true);
    try {
      const res =
        Platform.OS === 'ios'
          ? await api.walletApple(serial)
          : await api.walletGoogle(serial);
      await Linking.openURL(res.data.url);
    } catch (e) {
      const err = e as ApiError;
      Alert.alert('', err.message ?? t('errors.unknown'));
    } finally {
      setWalletLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={() => router.back()} className="self-start px-4 py-3">
          <BackArrow color="#111827" size={28} />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#003BC0" />
        </View>
      </SafeAreaView>
    );
  }

  // Next-reward cycle comes from the first (cheapest) reward, exactly
  // like web `/i/{serial}`. Falls back to 0 when the card has no rewards.
  const firstReward = data.card.all_rewards?.[0];
  const requiredForNext = firstReward?.stamps_required ?? 0;
  const readyToRedeem =
    requiredForNext > 0 ? Math.floor(data.card.stamps_count / requiredForNext) : 0;

  // Title fallback chain — mirrors web `CardVisual.tsx`:
  //   1. design.labels.title  (per-card title override set in the editor)
  //   2. card.name             (canonical card template name)
  //   3. tenant.name            (brand name — last-resort fallback)
  const designLabelTitle = (data.card.design as any)?.labels?.title;
  const title = designLabelTitle || data.card.name || data.tenant?.name || '';
  const customerName = data.customer?.name ?? '';
  const brandLogo = data.tenant?.logo_url ?? null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable onPress={() => router.back()} className="self-start px-4 py-3">
        <BackArrow color="#111827" size={28} />
      </Pressable>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
      >
        {/* The main card visual — matches the web /i/{serial} view */}
        <CardVisual
          design={data.card.design}
          title={title}
          collectedStamps={data.card.stamps_count}
          customerName={customerName}
          serial={data.card.serial}
          brandLogoUrl={brandLogo}
        />

        {/* Ready-to-redeem green banner — only when customer has at
            least one full reward cycle available */}
        {readyToRedeem > 0 && (
          <View className="flex-row items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
              <Gift color="#047857" size={22} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-emerald-900">
                {readyToRedeem === 1
                  ? 'لديك بطاقة جاهزة للاستبدال'
                  : readyToRedeem === 2
                  ? 'لديك بطاقتان جاهزتان للاستبدال'
                  : `لديك ${readyToRedeem} بطاقات جاهزة للاستبدال`}
              </Text>
              <Text className="mt-0.5 text-[11px] text-emerald-800/80">
                أظهر هذه الشاشة للكاشير عند التجار لاستلام {firstReward?.name ?? 'المكافأة'}
              </Text>
            </View>
          </View>
        )}

        {/* Add to Wallet */}
        <PrimaryButton
          label={
            Platform.OS === 'ios'
              ? t('card_detail.add_to_apple_wallet')
              : t('card_detail.add_to_google_wallet')
          }
          onPress={addToWallet}
          loading={walletLoading}
        />

        <RewardLadder rewards={data.card.all_rewards ?? []} />
      </ScrollView>
    </SafeAreaView>
  );
}
