import { View, Text } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { colors } from '../../../lib/colors';
import { Price } from '../detail/Price';
import type { Product } from '../types';

type Props = {
  product: Product;
};

/**
 * Header block for the product detail screen — name + price row
 * (with optional strike-through original price) + prep time +
 * long description copy.
 *
 * All text uses `text-start` + explicit `writingDirection` so the
 * Arabic copy aligns with the logical start edge (right in RTL,
 * left in LTR) regardless of react-native-web's per-Text Arabic
 * auto-detection.
 */
export function ProductMeta({ product }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View className="px-5 pt-5" style={{ gap: 16 }}>
      <View>
        <Text
          style={localeDirStyle}
          className="text-start text-xl font-bold text-gray-900"
        >
          {product.name}
        </Text>

        {/* Price row. In LTR the `Price` glyph sits to the right of
            the numbers, in RTL to the left — both follow the flex
            row's inherited direction. */}
        <View className="mt-1 flex-row items-center" style={{ gap: 8 }}>
          <Price amount={product.price} size={15} bold />
          {product.discountPrice !== undefined ? (
            <Price
              amount={product.discountPrice}
              size={13}
              color={colors.state.danger}
              textStyle={{ textDecorationLine: 'line-through' }}
            />
          ) : null}
        </View>

        {product.prepMinutes !== undefined ? (
          <View
            className="mt-1 flex-row items-center"
            style={{ gap: 6 }}
          >
            <Clock color={colors.ink.secondary} size={14} strokeWidth={2} />
            <Text className="text-xs text-gray-500">
              {product.prepMinutes} {t('product_detail.minutes')}
            </Text>
          </View>
        ) : null}
      </View>

      {product.description ? (
        <Text
          style={localeDirStyle}
          className="text-start text-sm leading-relaxed text-gray-500"
        >
          {product.description}
        </Text>
      ) : null}
    </View>
  );
}
