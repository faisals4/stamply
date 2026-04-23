import { View } from 'react-native';
import { Search, Share2 } from 'lucide-react-native';
import { colors } from '../../../lib/colors';
import { HeaderBar } from '../../ui/HeaderBar';
import { CircleButton } from '../../ui/CircleButton';
import { FavoriteButton } from '../../ui/FavoriteButton';
import type { Store } from '../types';

export const COMPACT_HEADER_HEIGHT = 56;

const COMPACT_ICON = 16;

type Props = {
  store: Store;
  onBack: () => void;
};

/**
 * Compact store-detail nav bar. Delegates to `HeaderBar` for the
 * back button + title. The end-action is the same 3-icon cluster
 * as the hero (search + favorite + share), but with the `bordered`
 * variant and 36 px size to match the solid-white header bg.
 *
 * Icons: same glyphs + same order as `StoreHero`, just smaller
 * (16 px vs 18 px) and with the bordered treatment.
 */
export function CompactHeader({ store, onBack }: Props) {
  return (
    <HeaderBar
      title={store.name}
      onBack={onBack}
      endAction={
        <View className="flex-row" style={{ gap: 6 }}>
          <CircleButton
            icon={<Search color={colors.ink.primary} size={COMPACT_ICON} strokeWidth={2} />}
          />
          <FavoriteButton size={36} iconSize={COMPACT_ICON} />
          <CircleButton
            icon={<Share2 color={colors.ink.primary} size={COMPACT_ICON} strokeWidth={2} />}
          />
        </View>
      }
    />
  );
}
