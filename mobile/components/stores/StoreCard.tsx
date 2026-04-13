import { View, Text, Image, Pressable, Platform } from 'react-native';
import { MapPin, Rocket } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { shadows } from '../../lib/shadows';
import { surfaces } from '../../lib/surfaces';
import type { Store } from './types';
import { colors } from '../../lib/colors';

type Props = {
  store: Store;
  onPress?: () => void;
};

/**
 * Single merchant card — cover image with overlays on top, plus a
 * body with the merchant name and category line.
 *
 * Cover overlays:
 *  - Express ribbon at the TOP inline-end corner (top-left in RTL,
 *    top-right in LTR) — the old Apple-Wallet-style "hero" slot.
 *  - Distance badge at the BOTTOM inline-end corner (bottom-left in
 *    RTL, bottom-right in LTR) — replaces the inline rating row
 *    that used to live in the body. Same styling as the express
 *    ribbon so the two pills read as one matching pair.
 *  - Merchant logo at the bottom inline-start (right in RTL, left
 *    in LTR) so it anchors the visual reading entry point of the
 *    card.
 *
 * Body: name + categories. No rating, no distance — both either
 * removed entirely (rating) or promoted to the cover overlay
 * (distance).
 *
 * RTL/LTR notes:
 *  - Logo, express ribbon, distance badge are pinned with
 *    `start-3` / `end-3` (logical insets) so they swap edges with
 *    the locale without branching.
 *  - Name + categories use a forced `writingDirection` so the
 *    Arabic text inside still aligns with the LOCALE direction
 *    instead of flipping to right-align in LTR mode (which is the
 *    default react-native-web behavior for Arabic content).
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

        {/* Express delivery ribbon — pinned to the TOP inline-end of
            the cover (top-left in RTL, top-right in LTR). Acts as
            the "hero" tag at the top of the image. Tight padding
            (px-2 / py-1) keeps it compact over the cover photo. */}
        {store.express ? (
          <View className="absolute top-3 end-3 flex-row items-center rounded-full bg-white px-2 py-1">
            <Rocket color={colors.state.express} size={12} strokeWidth={2} />
            <Text className="ms-1.5 text-xs font-bold text-gray-900">
              {t('stores.express')}
            </Text>
          </View>
        ) : null}

        {/* Distance badge — pinned to the BOTTOM inline-end, where
            the express ribbon used to live. Uses a translucent white
            pill (bg-white/80) so the cover photo hints through, and
            a regular-weight label so it reads as secondary info next
            to the bolder "يجيك طيارة" hero ribbon above. Same tight
            padding as the ribbon so the two read as a matching pair. */}
        <View
          className="absolute bottom-3 end-3 flex-row items-center rounded-full px-2 py-1"
          style={[
            { backgroundColor: 'rgba(255, 255, 255, 0.75)' },
            Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                } as any)
              : null,
          ]}
        >
          <MapPin color={colors.ink.tertiary} size={12} strokeWidth={2} />
          <Text className="ms-1.5 text-xs text-gray-900">
            {store.distanceKm.toFixed(2)} {t('stores.km')}
          </Text>
        </View>

        {/* Merchant logo — pinned to the inline-start of the cover
            (right in RTL, left in LTR) so it always sits at the
            visual reading entry point of the card. Renders a real
            merchant logo image when `store.logoUrl` is set, else
            falls back to the colored initials square. */}
        <View className="absolute bottom-3 start-3 h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white">
          {store.logoUrl ? (
            <Image
              source={{ uri: store.logoUrl }}
              style={{ width: 56, height: 56, borderRadius: 12 }}
              resizeMode="cover"
            />
          ) : (
            <View
              className="h-14 w-14 items-center justify-center rounded-xl"
              style={{ backgroundColor: store.logoColor }}
            >
              <Text className="text-3xs font-bold text-white" numberOfLines={1}>
                {store.logoLabel}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Card body — name + categories only. Rating removed; distance
          was promoted to a cover overlay pill above. */}
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
      </View>
    </Pressable>
  );
}
