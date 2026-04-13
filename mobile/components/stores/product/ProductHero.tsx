import { View, Text, Image } from 'react-native';
import { X, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../lib/colors';
import { CircleButton } from '../../ui/CircleButton';
import type { Product } from '../types';

const HERO_BTN = 40;
const HERO_ICON = 18;

export const PRODUCT_HERO_ASPECT_RATIO = 1.4;

type Props = {
  product: Product;
  onClose: () => void;
  onShare?: () => void;
};

/**
 * Full-bleed product hero image with two floating overlay buttons
 * (close + share) and an optional sold-out chip. Uses the shared
 * `CircleButton` with the `translucent` variant — same visual
 * treatment as `StoreHero`.
 */
export function ProductHero({ product, onClose, onShare }: Props) {
  const { t } = useTranslation();

  return (
    <View className="relative w-full" style={{ aspectRatio: PRODUCT_HERO_ASPECT_RATIO }}>
      <Image
        source={{ uri: product.image }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      <View className="absolute top-4 start-4">
        <CircleButton
          size={HERO_BTN}
          onPress={onClose}
          icon={<X color={colors.navIcon} size={HERO_ICON} strokeWidth={2} />}
        />
      </View>

      <View className="absolute top-4 end-4">
        <CircleButton
          size={HERO_BTN}
          onPress={onShare}
          icon={<Share2 color={colors.navIcon} size={HERO_ICON} strokeWidth={2} />}
        />
      </View>

      {product.soldOut ? (
        <View
          className="absolute bottom-4 self-center rounded-full px-4 py-1.5"
          style={{ backgroundColor: colors.state.danger }}
        >
          <Text className="text-xs font-bold text-white">
            {t('product_detail.sold_out')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
