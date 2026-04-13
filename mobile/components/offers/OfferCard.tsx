import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Truck, Clock, Tag, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { shadows } from '../../lib/shadows';
import { surfaces } from '../../lib/surfaces';
import type { Offer, OfferType } from './types';

type Props = {
  offer: Offer;
  onPress: () => void;
};

/* ─── Badge category system ─── */

type BadgeCategory = 'delivery' | 'limited_time' | 'general';

/**
 * Determine the badge category based on offer type and urgency.
 *   🟢 Green  = delivery offers (free_delivery)
 *   🔴 Red    = time-limited / urgent offers
 *   🟣 Purple = general (discounts, meal deals, cashback)
 */
function getBadgeCategory(offer: Offer): BadgeCategory {
  if (offer.type === 'free_delivery') return 'delivery';
  if (offer.urgent) return 'limited_time';
  return 'general';
}

const BADGE_COLORS: Record<BadgeCategory, { bg: string; text: string; icon: string }> = {
  delivery:     { bg: '#ECFDF5', text: '#047857', icon: '#047857' },
  limited_time: { bg: '#FEF2F2', text: '#DC2626', icon: '#DC2626' },
  general:      { bg: '#F5F3FF', text: '#7C3AED', icon: '#7C3AED' },
};

const BADGE_ICONS: Record<BadgeCategory, typeof Truck> = {
  delivery:     Truck,
  limited_time: Clock,
  general:      Tag,
};

/* ─── Headline accent color (still per-type for visual variety) ─── */

const HEADLINE_COLORS: Record<OfferType, string> = {
  free_delivery:       '#047857',
  percentage_discount: '#DC2626',
  meal_deal:           '#7C3AED',
  cashback:            '#2563EB',
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
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [expiresAt, enabled]);

  return remaining;
}

/**
 * Single offer card — compact design with:
 *   - Unified badge color system (green/red/purple)
 *   - Collapsible secondary details
 *   - Clear CTA button
 *
 * Layout:
 *   ┌──────────────────────────────────────┐
 *   │ [cover image — 120px tall]           │
 *   │ [category badge]  [countdown timer]  │
 *   │ [logo] headline                      │
 *   │        description (1 line)          │
 *   │ [▼ المزيد] (expandable details)      │
 *   │ [ ════ اطلب الآن ════ ]  ← CTA      │
 *   └──────────────────────────────────────┘
 */
export function OfferCard({ offer, onPress }: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = { writingDirection: isRTL ? 'rtl' : 'ltr' } as const;

  const [expanded, setExpanded] = useState(false);

  const category = getBadgeCategory(offer);
  const badgeScheme = BADGE_COLORS[category];
  const BadgeIcon = BADGE_ICONS[category];
  const headlineColor = HEADLINE_COLORS[offer.type];
  const countdown = useCountdown(offer.expiresAt, offer.urgent);

  const typeLabel = t(`offers.type_${offer.type}`);

  // Determine if there are secondary details to show
  const hasSecondaryDetails = offer.minOrder > 0 || !!offer.code;

  return (
    <View
      className={`overflow-hidden ${surfaces.card}`}
      style={shadows.card}
    >
      {/* Cover image with badges */}
      {offer.coverImage ? (
        <Pressable onPress={onPress}>
          <View className="relative">
            <Image
              source={{ uri: offer.coverImage }}
              style={{ width: '100%', height: 120 }}
              resizeMode="cover"
            />

            {/* Category badge — top inline-start */}
            <View
              className="absolute top-3 start-3 flex-row items-center rounded-full px-2.5 py-1"
              style={{ backgroundColor: badgeScheme.bg, gap: 4 }}
            >
              <BadgeIcon color={badgeScheme.icon} size={12} strokeWidth={2} />
              <Text style={{ color: badgeScheme.text, fontSize: 11, fontWeight: '700' }}>
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
        </Pressable>
      ) : null}

      {/* Body */}
      <View className="p-4">
        {/* Merchant row: logo + name */}
        <Pressable onPress={onPress}>
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
            style={[localeDirStyle, { color: headlineColor }]}
            className="mt-2 text-start text-lg font-bold"
          >
            {offer.headline}
          </Text>

          {/* Description — single line in compact mode */}
          <Text
            style={localeDirStyle}
            className="mt-1 text-start text-xs text-gray-500"
            numberOfLines={expanded ? undefined : 1}
          >
            {offer.description}
          </Text>
        </Pressable>

        {/* Expandable secondary details */}
        {hasSecondaryDetails ? (
          <>
            <Pressable
              onPress={() => setExpanded(!expanded)}
              className="mt-2 flex-row items-center"
              style={{ gap: 4 }}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600' }}>
                {expanded ? t('offers.less') : t('offers.more')}
              </Text>
              {expanded ? (
                <ChevronUp color="#9CA3AF" size={12} strokeWidth={2} />
              ) : (
                <ChevronDown color="#9CA3AF" size={12} strokeWidth={2} />
              )}
            </Pressable>

            {expanded ? (
              <View className="mt-2 flex-row items-center" style={{ gap: 12 }}>
                {offer.minOrder > 0 ? (
                  <Text className="text-xs text-gray-400">
                    {t('offers.min_order', { amount: offer.minOrder })}
                  </Text>
                ) : null}
                {offer.code ? (
                  <View
                    className="rounded-md border border-dashed px-2 py-0.5"
                    style={{ borderColor: headlineColor }}
                  >
                    <Text style={{ color: headlineColor, fontSize: 10, fontWeight: '700' }}>
                      {offer.code}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {/* CTA Button */}
        <Pressable
          onPress={onPress}
          className="mt-3 items-center justify-center rounded-xl py-3"
          style={{ backgroundColor: '#7C3AED' }}
        >
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
            {t('offers.cta_order')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
