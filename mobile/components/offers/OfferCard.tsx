import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Truck, Percent, UtensilsCrossed, Coins, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { shadows } from '../../lib/shadows';
import { surfaces } from '../../lib/surfaces';
import type { Offer, OfferType } from './types';

type Props = {
  offer: Offer;
  onPress: () => void;
};

/* ─── Color scheme per offer type ─── */

const TYPE_COLORS: Record<OfferType, { bg: string; text: string; icon: string }> = {
  free_delivery: { bg: '#ECFDF5', text: '#047857', icon: '#047857' },
  percentage_discount: { bg: '#FEF2F2', text: '#DC2626', icon: '#DC2626' },
  meal_deal: { bg: '#F5F3FF', text: '#7C3AED', icon: '#7C3AED' },
  cashback: { bg: '#EFF6FF', text: '#2563EB', icon: '#2563EB' },
};

const TYPE_ICONS: Record<OfferType, typeof Truck> = {
  free_delivery: Truck,
  percentage_discount: Percent,
  meal_deal: UtensilsCrossed,
  cashback: Coins,
};

/* ─── Countdown helper ─── */

function useCountdown(expiresAt: string, enabled: boolean) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining(`${h}:${String(m).padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 60_000); // update every minute
    return () => clearInterval(id);
  }, [expiresAt, enabled]);

  return remaining;
}

/**
 * Single offer card — full-width, color-coded by type, with an
 * optional countdown timer for urgent offers.
 *
 * Layout:
 *   ┌──────────────────────────────────────┐
 *   │ [cover image — 120px tall, rounded]  │
 *   │ [type badge]  [countdown if urgent]  │
 *   │ [logo] headline (largest text)       │
 *   │        description                   │
 *   │        min order · code (if any)     │
 *   └──────────────────────────────────────┘
 *
 * Color schemes:
 *   free_delivery       → green
 *   percentage_discount → red/orange
 *   meal_deal           → purple
 *   cashback            → blue
 */
export function OfferCard({ offer, onPress }: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = { writingDirection: isRTL ? 'rtl' : 'ltr' } as const;

  const scheme = TYPE_COLORS[offer.type];
  const Icon = TYPE_ICONS[offer.type];
  const countdown = useCountdown(offer.expiresAt, offer.urgent);

  const typeLabel = t(`offers.type_${offer.type}`);

  return (
    <Pressable
      onPress={onPress}
      className={`overflow-hidden ${surfaces.card}`}
      style={shadows.card}
    >
      {/* Cover image */}
      {offer.coverImage ? (
        <View className="relative">
          <Image
            source={{ uri: offer.coverImage }}
            style={{ width: '100%', height: 120 }}
            resizeMode="cover"
          />

          {/* Type badge — top inline-start */}
          <View
            className="absolute top-3 start-3 flex-row items-center rounded-full px-2.5 py-1"
            style={{ backgroundColor: scheme.bg, gap: 4 }}
          >
            <Icon color={scheme.icon} size={12} strokeWidth={2} />
            <Text style={{ color: scheme.text, fontSize: 11, fontWeight: '700' }}>
              {typeLabel}
            </Text>
          </View>

          {/* Countdown — top inline-end (only for urgent) */}
          {offer.urgent && countdown ? (
            <View
              className="absolute top-3 end-3 flex-row items-center rounded-full bg-red-500 px-2.5 py-1"
              style={{ gap: 4 }}
            >
              <Clock color="#FFF" size={10} strokeWidth={2} />
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                {countdown}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Body */}
      <View className="p-4">
        {/* Merchant row: logo + name */}
        <View className="flex-row items-center" style={{ gap: 8 }}>
          {offer.merchantLogo ? (
            <Image
              source={{ uri: offer.merchantLogo }}
              style={{ width: 28, height: 28, borderRadius: 8 }}
              resizeMode="cover"
            />
          ) : (
            <View
              className="items-center justify-center rounded-lg"
              style={{
                width: 28,
                height: 28,
                backgroundColor: offer.merchantLogoColor,
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: '700', color: '#FFF' }}>
                {offer.merchantLogoLabel}
              </Text>
            </View>
          )}
          <Text
            style={localeDirStyle}
            className="text-start text-xs text-gray-500"
          >
            {offer.merchantName}
          </Text>
        </View>

        {/* Headline */}
        <Text
          style={[localeDirStyle, { color: scheme.text }]}
          className="mt-2 text-start text-lg font-bold"
        >
          {offer.headline}
        </Text>

        {/* Description */}
        <Text
          style={localeDirStyle}
          className="mt-1 text-start text-xs text-gray-500"
        >
          {offer.description}
        </Text>

        {/* Footer: min order + code */}
        <View className="mt-3 flex-row items-center" style={{ gap: 12 }}>
          {offer.minOrder > 0 ? (
            <Text className="text-3xs text-gray-400">
              {t('offers.min_order', { amount: offer.minOrder })}
            </Text>
          ) : null}
          {offer.code ? (
            <View
              className="rounded-md border border-dashed px-2 py-0.5"
              style={{ borderColor: scheme.text }}
            >
              <Text style={{ color: scheme.text, fontSize: 10, fontWeight: '700' }}>
                {offer.code}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
