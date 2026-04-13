import { View, Text, Image, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { colors } from '../../../lib/colors';
import { QuantityControl } from './QuantityControl';
import { Price } from './Price';
import type { Product } from '../types';

const TILE_SIZE = 96;
const ADD_BUTTON_SIZE = 28;

type Props = {
  product: Product;
  /** Current quantity for this product in the parent screen's cart.
   *  0 when the item has not been added yet. */
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  /** Called when the user taps anywhere on the row except the
   *  QuantityControl's inner buttons. Opens the full product
   *  detail screen. */
  onPress?: () => void;
};

/**
 * Full-width list card used by every section EXCEPT "الأكثر مبيعًا".
 *
 * Logical layout (same JSX order in both locales — flex-row inherits
 * direction from the active document):
 *
 *   [ name + description + price ] ... [ image tile + "قابل للتعديل" ]
 *           ^ inline-start                       ^ inline-end
 *
 * In RTL (Arabic) the text column appears on the right edge and the
 * image tile on the left edge. In LTR (English) the text column
 * appears on the left edge and the image tile on the right edge —
 * matching the typical LTR delivery-app card where the image is an
 * end-aligned thumbnail next to the item copy.
 *
 * When the product has a `discountPrice`, the original price renders
 * with a strike-through next to the discounted price in danger-red,
 * matching the reference video's "وجبات التوفير" section. A circular
 * `%{percent}` badge is also pinned to the top inline-start corner
 * of the image tile.
 */
export function ProductListCard({
  product,
  quantity,
  onAdd,
  onRemove,
  onPress,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-start px-4 py-4"
      style={{ gap: 12 }}
    >
      {/* Text column — first in JSX so it sits at inline-start in
          both locales. `flex-1` lets it fill the rest of the row. */}
      <View className="flex-1">
        <Text
          style={localeDirStyle}
          className="text-start text-sm font-bold text-gray-900"
          numberOfLines={2}
        >
          {product.name}
        </Text>
        {product.description ? (
          <Text
            style={localeDirStyle}
            className="mt-1 text-start text-xs text-gray-500"
            numberOfLines={3}
          >
            {product.description}
          </Text>
        ) : null}

        {/* Price row — simple case vs. discounted case. The
            `Price` component renders the Saudi Riyal glyph next to
            the number, inheriting size/color/bold from its props
            so the discount treatment (strike-through + red) still
            works via the same pipeline. */}
        <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
          {product.discountPrice !== undefined ? (
            <>
              <Price
                amount={product.price}
                size={12}
                color={colors.ink.tertiary}
                textStyle={{ textDecorationLine: 'line-through' }}
              />
              <Price
                amount={product.discountPrice}
                size={14}
                color={colors.state.danger}
                bold
              />
            </>
          ) : (
            <Price amount={product.price} size={14} bold />
          )}
        </View>
      </View>

      {/* Image tile column — second in JSX so it sits at inline-end
          in both locales (left in RTL, right in LTR). Neutral
          gray-100 fill matches the ProductGridCard treatment so
          the two layouts feel like siblings. */}
      <View className="items-center">
        <View
          className="relative overflow-hidden rounded-2xl bg-gray-100"
          style={{
            width: TILE_SIZE,
            height: TILE_SIZE,
          }}
        >
          <Image
            source={{ uri: product.image }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            resizeMode="cover"
          />

          <View className="absolute bottom-2 end-2">
            <QuantityControl
              quantity={quantity}
              onAdd={onAdd}
              onRemove={onRemove}
              size={ADD_BUTTON_SIZE}
              iconSize={14}
            />
          </View>

          {/* Discount badge — top inline-end corner (left in RTL,
              right in LTR). Matches where the action row sits and
              mirrors the reference video's "وجبات التوفير" card. */}
          {product.discountPercent ? (
            <View
              className="absolute top-2 end-2 items-center justify-center rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: colors.state.danger }}
            >
              <Text className="text-3xs font-bold text-white">
                %{product.discountPercent}
              </Text>
            </View>
          ) : null}
        </View>

        {/* "قابل للتعديل" caption. Rendered under the tile rather
            than inside it so the tile stays visually clean. */}
        {product.customizable ? (
          <Text className="mt-1.5 text-3xs text-gray-400">
            {t('store_detail.customizable')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
