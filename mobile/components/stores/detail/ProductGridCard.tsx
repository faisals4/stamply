import { View, Text, Image, Pressable } from 'react-native';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { QuantityControl } from './QuantityControl';
import { Price } from './Price';
import type { Product } from '../types';

const CARD_HEIGHT = 180;
const ADD_BUTTON_SIZE = 32;

type Props = {
  product: Product;
  width: number;
  /** Current quantity for this product in the parent screen's cart.
   *  0 when the item has not been added yet. */
  quantity: number;
  /** Increment quantity by one. */
  onAdd: () => void;
  /** Decrement quantity by one; removes the entry entirely when
   *  called with quantity === 1. */
  onRemove: () => void;
  /** Called when the user taps the card body (not the `+` button).
   *  Opens the full product detail screen. */
  onPress?: () => void;
};

/**
 * Square grid card used by the "الأكثر مبيعًا" section. The card
 * itself is a neutral light-gray square with the product image
 * floating inside; the product name and price live OUTSIDE the
 * tile, directly below it.
 *
 * An optional `brandLabel` (e.g. "SAUDI MADE") renders as a small
 * white chip at the top of the tile.
 *
 * The cart control is pinned to the bottom inline-END corner (left
 * in RTL, right in LTR). It morphs in place between three shapes
 * as the cart quantity changes — see `QuantityControl` for the
 * full behavior. The control sizes match the surrounding card:
 * 32 px circular button, 18 px lucide glyphs.
 */
export function ProductGridCard({
  product,
  width,
  quantity,
  onAdd,
  onRemove,
  onPress,
}: Props) {
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View style={{ width }}>
      {/* Neutral tile — tap opens the product detail screen. Wrapped
          in a Pressable so the whole image + brand chip area is a
          single tap target, but the QuantityControl below is an
          absolute sibling that eats its own taps so the `+`/`−`
          buttons do NOT navigate. */}
      <Pressable
        onPress={onPress}
        className="relative overflow-hidden rounded-2xl bg-gray-100"
        style={{ height: CARD_HEIGHT }}
      >
        {product.brandLabel ? (
          <View className="absolute top-3 self-center rounded-md bg-white px-2 py-0.5">
            <Text className="text-3xs font-bold text-gray-900">
              {product.brandLabel}
            </Text>
          </View>
        ) : null}

        {/* Product image — fills the whole tile edge-to-edge so the
            neutral gray background never shows through as empty
            space. `cover` crops to the short side and keeps the
            aspect ratio, so remote photos always fill the square. */}
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

        {/* Cart control — bottom inline-end, so in RTL it appears
            at the bottom-left corner of the tile and in LTR at the
            bottom-right corner. Expands into a +/count/- pill once
            the item is in the cart.

            The nested Pressables inside QuantityControl capture
            their own taps, so pressing `+`/`−`/🗑 never bubbles
            up to the outer card Pressable — meaning those buttons
            modify the cart without navigating to the detail screen. */}
        <View className="absolute bottom-3 end-3">
          <QuantityControl
            quantity={quantity}
            onAdd={onAdd}
            onRemove={onRemove}
            size={ADD_BUTTON_SIZE}
            iconSize={18}
          />
        </View>
      </Pressable>

      {/* Name + price — rendered OUTSIDE the colored tile, mirroring
          the reference design where product metadata lives in a
          neutral area below the branded card. Explicit
          writingDirection keeps Arabic strings aligned with the
          LOCALE direction on the web, matching the rest of the
          screen. */}
      <Text
        style={localeDirStyle}
        className="mt-2 text-center text-sm font-bold text-gray-900"
        numberOfLines={2}
      >
        {product.name}
      </Text>
      {/* Price — centered below the name. Wrapped in a center-
          justified flex row because `Price` itself is flex so a
          plain `text-center` wouldn't center it horizontally. */}
      <View className="mt-1 flex-row items-center justify-center">
        <Price amount={product.price} size={14} />
      </View>
    </View>
  );
}
