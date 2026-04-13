import { useState } from 'react';
import {
  View,
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
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { api, ApiError } from '../../lib/api';
import { useIsRTL } from '../../lib/rtl';
import { CardVisual } from '../../components/cards/CardVisual';
import { RewardReadyBanner } from '../../components/cards/RewardReadyBanner';
import { RewardLadder } from '../../components/cards/RewardLadder';
import { PrimaryButton } from '../../components/PrimaryButton';
import { queryKeys } from '../../lib/queryKeys';
import { colors } from '../../lib/colors';

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
    refetchInterval: 5000, // live updates mirror the web /i/{serial} page
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
      <SafeAreaView className="flex-1 bg-page">
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={() => router.back()} className="self-start px-4 py-3">
          <BackArrow color={colors.ink.primary} size={28} />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
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

  const title = data.card.name ?? data.tenant?.name ?? '';
  const customerName = data.customer?.name ?? '';
  const brandLogo = data.tenant?.logo_url ?? null;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable onPress={() => router.back()} className="self-start px-4 py-3">
        <BackArrow color={colors.ink.primary} size={28} />
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

        <RewardReadyBanner count={readyToRedeem} rewardName={firstReward?.name} />

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
