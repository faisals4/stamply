import { View, Text, Image, Platform } from 'react-native';
import {
  Search,
  Share2,
  ChevronLeft,
  ChevronRight,
  Crown,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../../lib/rtl';
import { colors } from '../../../lib/colors';
import { CircleButton } from '../../ui/CircleButton';
import { FavoriteButton } from '../../ui/FavoriteButton';
import type { Store } from '../types';

const HERO_HEIGHT = 240;
const HERO_BTN = 40;
const HERO_ICON = 18;

type Props = {
  store: Store;
  onBack: () => void;
};

/**
 * Full-bleed merchant cover image with floating overlay buttons
 * and an optional "مميز" featured chip at the bottom edge.
 *
 * All overlay buttons use shared `ui/` components:
 *   - `CircleButton(translucent)` for back, search, share
 *   - `FavoriteButton(translucent)` for the animated heart toggle
 *
 * Same icons and sizes are replicated in `CompactHeader` (the
 * sticky bar variant) using the `bordered` variant, so the two
 * bars feel like one family.
 */
export function StoreHero({ store, onBack }: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  const coverRadius =
    Platform.OS === 'web'
      ? { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }
      : null;

  return (
    <View className="relative" style={{ height: HERO_HEIGHT }}>
      <Image
        source={{ uri: store.cover }}
        style={[{ width: '100%', height: HERO_HEIGHT }, coverRadius]}
        resizeMode="cover"
      />

      {/* Inline-start: back. */}
      <View className="absolute top-12 start-4">
        <CircleButton
          size={HERO_BTN}
          onPress={onBack}
          icon={<BackIcon color={colors.navIcon} size={HERO_ICON + 4} strokeWidth={2} />}
        />
      </View>

      {/* Inline-end: search + favorite + share. */}
      <View className="absolute top-12 end-4 flex-row" style={{ gap: 8 }}>
        <CircleButton
          size={HERO_BTN}
          icon={<Search color={colors.navIcon} size={HERO_ICON} strokeWidth={2} />}
        />
        <FavoriteButton size={HERO_BTN} iconSize={HERO_ICON} />
        <CircleButton
          size={HERO_BTN}
          icon={<Share2 color={colors.navIcon} size={HERO_ICON} strokeWidth={2} />}
        />
      </View>

      {/* Featured chip. */}
      {store.featured ? (
        <View
          className="absolute bottom-4 end-4 flex-row items-center rounded-full px-3 py-1.5"
          style={{ backgroundColor: colors.state.warning }}
        >
          <Crown color={colors.white} size={12} strokeWidth={2.5} />
          <Text className="ms-1.5 text-xs font-bold text-white">
            {t('store_detail.featured')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export const STORE_HERO_HEIGHT = HERO_HEIGHT;
