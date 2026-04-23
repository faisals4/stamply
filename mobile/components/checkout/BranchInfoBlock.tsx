import { View, Text, Image, Pressable, Linking } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import type { Branch } from './branch-data';

type Props = {
  variant: 'pickup' | 'curbside';
  branch: Branch | null;
  isInvalid?: boolean;
  onSelectBranch: () => void;
  onChangeBranch: () => void;
};

/**
 * Branch info block shown when `orderType === 'pickup' | 'curbside'`.
 *
 * Two states:
 *   - **Branch selected**: static map image + branch name + address
 *     hint + "الاتجاهات" button + "اختر فرع اخر" button.
 *   - **No branch**: prompt text + "اختر فرع الاستلام" button.
 *
 * The map uses a static OpenStreetMap tile image (no interactive
 * Leaflet) — tapping it opens Google Maps in the browser/native
 * maps app. This avoids bundling a full map SDK for a non-
 * interactive display.
 *
 * `variant` controls the title: "استلام من الفرع" (pickup) vs
 * "استلام من السيارة" (curbside). Everything else is identical.
 */
export function BranchInfoBlock({
  variant,
  branch,
  isInvalid = false,
  onSelectBranch,
  onChangeBranch,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  const title =
    variant === 'pickup'
      ? t('checkout.block_pickup_title')
      : t('checkout.block_curbside_title');

  if (!branch) {
    return (
      <View
        className="mx-4 rounded-2xl border bg-white p-4"
        style={{
          borderColor: isInvalid ? colors.state.danger : colors.ink.border,
        }}
      >
        <Text
          style={[localeDirStyle, isInvalid ? { color: colors.state.danger } : null]}
          className="text-start text-sm font-bold text-gray-900"
        >
          {title}
        </Text>
        <Text
          style={localeDirStyle}
          className="mt-2 text-start text-xs text-gray-500"
        >
          {t('checkout.block_branch_empty')}
        </Text>
        <Pressable
          onPress={onSelectBranch}
          className="mt-3 items-center rounded-xl border border-gray-200 py-2"
        >
          <Text className="text-xs text-gray-700">
            {t('checkout.block_branch_select')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`;

  const openDirections = () => {
    Linking.openURL(directionsUrl);
  };

  return (
    <View
      className="mx-4 overflow-hidden rounded-2xl border bg-white"
      style={{
        borderColor: isInvalid ? colors.state.danger : colors.ink.border,
      }}
    >
      {/* Title */}
      <View className="px-4 pt-4">
        <Text
          style={localeDirStyle}
          className="text-start text-sm font-bold text-gray-900"
        >
          {title}
        </Text>
      </View>

      {/* Static map — tapping opens Google Maps. Using an iframe-
          style embed URL rendered as an Image would require a
          WebView; instead we show a simple placeholder map tile
          and the user navigates via the "Directions" button. */}
      <Pressable onPress={openDirections} className="mt-3" style={{ height: 140, backgroundColor: '#E5E7EB' }}>
        <Image
          source={{
            uri: `https://staticmap.openstreetmap.de/staticmap.php?center=${branch.lat},${branch.lng}&zoom=16&size=400x140&maptype=mapnik&markers=${branch.lat},${branch.lng},blue`,
          }}
          style={{ width: '100%', height: 140 }}
          resizeMode="cover"
        />
      </Pressable>

      {/* Branch info */}
      <View className="p-4" style={{ gap: 12 }}>
        <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
          {/* Branch name + address hint */}
          <View className="flex-1 flex-row items-start" style={{ gap: 8 }}>
            <MapPin color={colors.ink.tertiary} size={18} strokeWidth={2} style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text
                style={localeDirStyle}
                className="text-start text-sm font-medium text-gray-900"
              >
                {branch.name}
              </Text>
              <Text
                style={localeDirStyle}
                className="mt-0.5 text-start text-xs text-gray-500"
              >
                {t('checkout.block_branch_address_hint')}
              </Text>
            </View>
          </View>

          {/* Directions button */}
          <Pressable
            onPress={openDirections}
            className="flex-row items-center rounded-xl border border-gray-200 px-3 py-1.5"
            style={{ gap: 6 }}
          >
            <Navigation color={colors.ink.primary} size={14} strokeWidth={2} />
            <Text className="text-xs text-gray-700">
              {t('checkout.block_branch_directions')}
            </Text>
          </Pressable>
        </View>

        {/* Change branch button */}
        <Pressable
          onPress={onChangeBranch}
          className="items-center rounded-xl border border-gray-200 py-2"
        >
          <Text className="text-xs text-gray-700">
            {t('checkout.block_branch_change')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}


