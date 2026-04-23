import { useState } from 'react';
import {
  View,
  Text,
  Platform,
  Linking,
} from 'react-native';
import { Gift } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { api, ApiError, CardFull, Tenant } from '../lib/api';
import { CardVisual } from './CardVisual';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  card: CardFull;
  tenant: Tenant | null;
};

/**
 * Full-width card block shown on the cards list screen. Stacks the
 * `CardVisual` + ready-to-redeem banner + wallet button + stamp
 * history into a single self-contained unit so the customer can see
 * everything important about one card without drilling into a detail
 * page.
 *
 * The list screen renders one of these per card; multiple cards
 * simply scroll vertically.
 */
export function FullCard({ card, tenant }: Props) {
  const { t, i18n } = useTranslation();
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const firstReward = card.all_rewards?.[0];
  const requiredForNext = firstReward?.stamps_required ?? 0;
  const readyToRedeem =
    requiredForNext > 0
      ? Math.floor(card.stamps_count / requiredForNext)
      : 0;

  const hasMultipleRewards = (card.all_rewards?.length ?? 0) > 1;
  const title = card.name ?? tenant?.name ?? '';
  const customerName = card.customer_name ?? '';

  const addToWallet = async () => {
    if (walletLoading) return;
    setWalletError(null);
    setWalletLoading(true);
    try {
      const res =
        Platform.OS === 'ios'
          ? await api.walletApple(card.serial)
          : await api.walletGoogle(card.serial);
      await Linking.openURL(res.data.url);
    } catch (e) {
      const err = e as ApiError;
      setWalletError(err.message ?? t('errors.unknown'));
    } finally {
      setWalletLoading(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Main card visual */}
      <CardVisual
        design={card.design}
        title={title}
        collectedStamps={card.stamps_count}
        customerName={customerName}
        serial={card.serial}
        brandLogoUrl={tenant?.logo_url ?? null}
      />

      {/* Ready-to-redeem banner */}
      {readyToRedeem > 0 && (
        <View className="flex-row items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
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

      {/* Wallet button */}
      <PrimaryButton
        label={
          Platform.OS === 'ios'
            ? t('card_detail.add_to_apple_wallet')
            : t('card_detail.add_to_google_wallet')
        }
        onPress={addToWallet}
        loading={walletLoading}
      />
      {walletError ? (
        <Text className="text-center text-sm text-red-600">{walletError}</Text>
      ) : null}

      {/* Multi-reward ladder (only when there's more than one) */}
      {hasMultipleRewards && (
        <View className="rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-sm font-semibold text-gray-900">
            {t('card_detail.rewards')}
          </Text>
          {card.all_rewards.map((r, i) => (
            <View
              key={r.id ?? i}
              className={
                'flex-row items-center justify-between py-2 ' +
                (i > 0 ? 'border-t border-gray-100' : '')
              }
            >
              <Text
                className={
                  r.achieved
                    ? 'text-sm font-medium text-gray-900'
                    : 'text-sm text-gray-500'
                }
              >
                {r.name}
              </Text>
              <Text
                className={
                  r.achieved
                    ? 'text-xs font-semibold text-emerald-600'
                    : 'text-xs text-gray-500'
                }
              >
                {r.achieved ? 'جاهزة ✓' : `${r.stamps_required} ختم`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Stamps history */}
      {card.stamps_history?.length ? (
        <View className="rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-sm font-semibold text-gray-900">
            {t('card_detail.stamps_history')}
          </Text>
          {card.stamps_history.map((s, i) => (
            <View
              key={s.id}
              className={
                'flex-row items-center py-2 ' +
                (i > 0 ? 'border-t border-gray-100' : '')
              }
            >
              <View className="h-2 w-2 rounded-full bg-brand" />
              <Text className="ms-3 text-sm text-gray-700">
                {formatDate(s.created_at)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
