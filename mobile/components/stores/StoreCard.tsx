import { View, Text, Image, Pressable, Platform } from 'react-native';
import { Star, MapPin, Bike, Rocket, BadgePercent } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { shadows } from '../../lib/shadows';
import { surfaces } from '../../lib/surfaces';
import type { Store } from './types';

type Props = {
  store: Store;
  onPress?: () => void;
};

/**
 * Single merchant card — cover image with overlays on top, plus a
 * body row with name, categories, rating, distance, and badges.
 *
 * RTL/LTR notes:
 *  - Logo and express ribbon are pinned with `start-3` / `end-3`
 *    (logical insets) so they swap edges with the locale.
 *  - Name + categories use a forced `writingDirection` so the Arabic
 *    text inside still aligns with the LOCALE direction instead of
 *    flipping to right-align in LTR mode (which is the default
 *    react-native-web behavior for Arabic content).
 *  - The flex-row rating row and badges row inherit document
 *    direction natively, so they stay in reading order without any
 *    explicit per-locale branching.
 */
export function StoreCard({ store, onPress }: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  // React Native Web auto-detects the content language and forces
  // `direction: rtl` on Text elements containing Arabic, which makes
  // CSS `text-align: start` resolve to "right" even on LTR pages.
  // We override `writingDirection` so the merchant name and category
  // line follow the LOCALE direction.
  const localeDirStyle = { writingDirection: isRTL ? 'rtl' : 'ltr' } as const;

  return (
    <Pressable
      onPress={onPress}
      className={`overflow-hidden ${surfaces.card}`}
      // Shared card shadow — see mobile/lib/shadows.ts.
      style={shadows.card}
    >
      {/* Cover image with overlays */}
      <View className="relative">
        <Image
          source={{ uri: store.cover }}
          style={{ width: '100%', height: 180 }}
          resizeMode="cover"
        />

        {/* Express delivery ribbon — pinned to the inline-end of the
            cover (left in RTL, right in LTR) so it sits opposite the
            logo regardless of language direction. */}
        {store.express ? (
          <View className="absolute bottom-3 end-3 flex-row items-center rounded-lg bg-white px-2.5 py-1.5">
            <Rocket color="#F97316" size={12} strokeWidth={2} />
            <Text className="ms-1.5 text-xs font-bold text-gray-900">
              {t('stores.express')}
            </Text>
          </View>
        ) : null}

        {/* Merchant logo — pinned to the inline-start of the cover
            (right in RTL, left in LTR) so it always sits at the
            visual reading entry point of the card. */}
        <View className="absolute bottom-3 start-3 h-16 w-16 items-center justify-center rounded-2xl border border-gray-100 bg-white">
          <View
            className="h-14 w-14 items-center justify-center rounded-xl"
            style={{ backgroundColor: store.logoColor }}
          >
            <Text className="text-[10px] font-bold text-white" numberOfLines={1}>
              {store.logoLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Card body */}
      <View className="p-4">
        <Text
          style={localeDirStyle}
          className="text-start text-base font-bold text-gray-900"
        >
          {store.name}
        </Text>
        <Text
          style={localeDirStyle}
          className="mt-1 text-start text-xs text-gray-500"
          numberOfLines={1}
        >
          {store.categories.join('، ')}
        </Text>

        {/* Rating + distance row */}
        <View className="mt-3 flex-row items-center" style={{ gap: 6 }}>
          <Star color="#FBBF24" size={14} fill="#FBBF24" strokeWidth={0} />
          <Text className="text-xs font-bold text-gray-900">
            {store.rating.toFixed(2)}
          </Text>
          <Text className="mx-2 text-gray-300">|</Text>
          <MapPin color="#9CA3AF" size={12} strokeWidth={1.5} />
          <Text className="text-xs text-gray-500">
            {store.distanceKm.toFixed(2)} {t('stores.km')}
          </Text>
        </View>

        {/* Badges row — delivery is always present, cashback is optional */}
        <View className="mt-3 flex-row flex-wrap items-center" style={{ gap: 8 }}>
          <View className="flex-row items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5">
            <Bike color="#eb592e" size={12} strokeWidth={2} />
            <Text className="ms-1.5 text-xs font-semibold text-brand">
              {t('stores.delivery', { fee: store.deliveryFee })}
            </Text>
          </View>
          {store.cashback ? (
            <View className="flex-row items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
              <BadgePercent color="#D97706" size={12} strokeWidth={2} />
              <Text className="ms-1.5 text-xs font-semibold text-amber-700">
                {t('stores.cashback', { percent: store.cashback })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
