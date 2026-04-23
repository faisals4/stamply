import { View, Text, Pressable, Image } from 'react-native';
import { MapPin, Rocket } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { shadows } from '../../lib/shadows';
import { surfaces } from '../../lib/surfaces';
import { colors } from '../../lib/colors';
import type { Store } from './types';

type Props = {
  store: Store;
  onPress?: () => void;
};

/**
 * Compact list-row variant of `StoreCard` — the "second view" the
 * stores screen offers when the user toggles to the menu icon in the
 * section header.
 *
 * Trades the big cover image for density: each row is ~72px tall
 * instead of ~300px, so the same viewport shows 7-8 merchants at
 * once instead of ~2. Layout follows the standard directory list
 * pattern used by Apple Maps, Google Maps, Yelp, and Uber Eats:
 *
 *   [logo] [ name          ] [ distance ]
 *          [ categories     ] [ 🚀        ]
 *
 * Everything stays inside a single `flex-row` so RTL/LTR flips
 * automatically via document direction — no per-locale branching.
 * The merchant name and category line force `writingDirection` to
 * the LOCALE direction (not the content direction) for the same
 * reason as the card variant: Arabic content would otherwise
 * auto-detect as RTL and drift to the wrong edge in an LTR layout.
 */
export function StoreRow({ store, onPress }: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = { writingDirection: isRTL ? 'rtl' : 'ltr' } as const;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center ${surfaces.card} p-3`}
      // Shared card shadow — keeps rows feeling lifted on the
      // gray-50 page background, same depth as the card variant.
      style={shadows.card}
    >
      {/* Merchant logo — 80×80 square. Renders a real merchant logo
          image when `store.logoUrl` is set, else falls back to a
          colored initials square. Sized big enough to read as the
          row's visual anchor, small enough that each row stays
          compact and 4-5 merchants fit in one viewport. */}
      {store.logoUrl ? (
        <Image
          source={{ uri: store.logoUrl }}
          style={{ width: 80, height: 80, borderRadius: 12 }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="items-center justify-center rounded-xl"
          style={{ width: 80, height: 80, backgroundColor: store.logoColor }}
        >
          <Text className="text-sm font-bold text-white" numberOfLines={1}>
            {store.logoLabel}
          </Text>
        </View>
      )}

      {/* Middle column — name + categories. `flex-1` so it stretches
          to fill whatever space the logo and trailing column leave. */}
      <View className="ms-3 flex-1">
        <Text
          style={localeDirStyle}
          className="text-start text-sm font-bold text-gray-900"
          numberOfLines={1}
        >
          {store.name}
        </Text>
        <Text
          style={localeDirStyle}
          className="mt-0.5 text-start text-xs text-gray-500"
          numberOfLines={1}
        >
          {store.categories.join('، ')}
        </Text>
      </View>

      {/* Trailing column — distance pill with express indicator.
          `items-end` keeps the distance flush to the row's
          inline-end edge (left in RTL, right in LTR) while keeping
          the express icon centered on the row below it. */}
      <View className="ms-3 items-end" style={{ gap: 4 }}>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <MapPin color={colors.ink.tertiary} size={12} strokeWidth={1.5} />
          <Text className="text-xs text-gray-500">
            {store.distanceKm.toFixed(2)} {t('stores.km')}
          </Text>
        </View>
        {store.express ? (
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Rocket color={colors.state.express} size={10} strokeWidth={2} />
            <Text className="text-3xs text-gray-500">{t('stores.express')}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
