import { View, Text, Image } from 'react-native';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { shadows } from '../../../lib/shadows';
import { surfaces } from '../../../lib/surfaces';
import type { Store } from '../types';

type Props = {
  store: Store;
};

/**
 * Floating info card that overlaps the bottom of the hero image.
 *
 * Layout mirrors the reference detail screen: the merchant logo sits
 * at the inline-start edge of the card (right in RTL, left in LTR)
 * and visually anchors the reading entry point. The name and the
 * category line sit next to the logo.
 *
 * No rating is rendered anywhere — this is a deliberate product
 * decision for Stamply: the detail screen never shows reviews,
 * stars, or rating counts, even though the `rating` field exists
 * on the `Store` type for compatibility with the list view.
 */
export function StoreInfoCard({ store }: Props) {
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View
      className={`mx-4 flex-row items-center p-4 ${surfaces.card}`}
      // Negative top margin pulls the card up over the bottom of the
      // hero image so ~40px of the card sits on top of the cover and
      // creates the "floating" effect seen in the reference design.
      style={[{ marginTop: -40 }, shadows.card]}
    >
      {/* Logo square — same pattern as StoreCard. Renders a real
          merchant logo image when `store.logoUrl` is set, else falls
          back to the colored initials square. */}
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white">
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

      {/* Name + categories column. `flex-1` + `ms-4` so the text
          grows to fill the remaining width and the logo stays its
          fixed size on the inline-start edge. */}
      <View className="ms-4 flex-1">
        <Text
          style={localeDirStyle}
          className="text-start text-lg font-bold text-gray-900"
          numberOfLines={1}
        >
          {store.name}
        </Text>
        <Text
          style={localeDirStyle}
          className="mt-1 text-start text-xs text-gray-500"
          numberOfLines={2}
        >
          {store.categories.join('، ')}
        </Text>
      </View>
    </View>
  );
}
