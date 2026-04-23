import { View, Text, Pressable } from 'react-native';
import { Plus, Minus, Trash2 } from 'lucide-react-native';
import { colors } from '../../../lib/colors';

type Props = {
  /** Current quantity for this product in the cart. 0 means the
   *  product is not in the cart yet. */
  quantity: number;
  /** Called when the user taps the plus button. */
  onAdd: () => void;
  /** Called when the user taps the minus or trash button. */
  onRemove: () => void;
  /** Size of each circular sub-button and the pill height. The
   *  list card uses 28, the grid card uses 32. */
  size: number;
  /** Lucide icon stroke width — matches the surrounding cover
   *  styling. Grid = 2.5, list = 2.5. */
  iconStroke?: number;
  /** Size of the lucide glyphs inside each sub-button. Grid uses
   *  18, list uses 16. */
  iconSize: number;
  /** When true, the minus button at quantity 1 renders as a
   *  DISABLED minus icon (grayed out, non-interactive) instead of
   *  a trash icon. Used by the product detail screen's bottom
   *  bar where dropping the quantity to zero isn't a valid
   *  action — the minimum order quantity is 1.
   *
   *  Defaults to false so the standard delete-at-1 behavior used
   *  by cart cards and product list cards still works. */
  disableRemoveAtOne?: boolean;
  /** Explicit border radius override. Defaults to the pill shape
   *  (`size / 2`). Product detail's bottom bar uses this to match
   *  the neighboring "Add" button's `rounded-2xl` corners
   *  (16 px) so the two controls visually belong to the same
   *  row. */
  borderRadius?: number;
};

/**
 * Stateless quantity control used on every product card. Renders
 * two mutually-exclusive shapes based on the current quantity:
 *
 *   1. `quantity === 0` — a single circular `+` button. Tapping it
 *      fires `onAdd`, which the parent screen increments to 1 and
 *      re-renders this component into shape 2 below.
 *
 *   2. `quantity >= 1` — a horizontal white pill containing (in
 *      JSX order): a trash OR minus icon button, the current
 *      quantity as bold text, and a `+` icon button. Layout order
 *      is JSX-driven so it flips naturally with RTL/LTR document
 *      direction:
 *
 *        RTL:  [  🗑/−     1     +  ]    (trash/minus = start=right)
 *        LTR:  [  🗑/−     1     +  ]    (trash/minus = start=left)
 *
 *      In both locales the left button visually corresponds to the
 *      first JSX child (trash/minus). Which glyph renders depends
 *      on the current quantity:
 *
 *        quantity === 1 → Trash icon  (next tap removes entirely)
 *        quantity >  1 → Minus icon  (next tap decrements by one)
 *
 *      This matches the common food-delivery pattern where the
 *      "remove" action morphs between "delete item from cart" and
 *      "decrement quantity" depending on whether removing would
 *      clear the entry.
 *
 * The pill itself has the same size, border and color treatment
 * as the plus-only button, so the transition between shapes feels
 * like an extension in place rather than a component swap.
 */
export function QuantityControl({
  quantity,
  onAdd,
  onRemove,
  size,
  iconStroke = 2.5,
  iconSize,
  disableRemoveAtOne = false,
  borderRadius,
}: Props) {
  // Default to a fully-rounded pill shape when no explicit radius
  // is provided. Product detail's bottom bar overrides this with
  // 16 to match the neighboring "Add" button.
  const radius = borderRadius ?? size / 2;

  // Empty state — just a single `+` button.
  if (quantity <= 0) {
    return (
      <Pressable
        onPress={onAdd}
        hitSlop={6}
        className="items-center justify-center border border-gray-200 bg-white"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Plus color={colors.ink.primary} size={iconSize} strokeWidth={iconStroke} />
      </Pressable>
    );
  }

  // Filled state — pill with three segments. Each sub-button has
  // its own hitSlop so the small tap targets on mobile are still
  // easy to hit. The middle count cell has a minimum width so the
  // pill doesn't jump around as the number changes (1 → 10, etc).
  //
  // Left glyph picker:
  //   - quantity > 1 → interactive minus (decrements to N-1)
  //   - quantity === 1 + disableRemoveAtOne → disabled minus glyph
  //     (no trash; action below zero is blocked)
  //   - quantity === 1 + !disableRemoveAtOne → trash glyph
  //     (next tap removes the line entirely — cart + list cards)
  const showDisabledMinus = quantity === 1 && disableRemoveAtOne;
  const LeftIcon = showDisabledMinus || quantity > 1 ? Minus : Trash2;
  const leftIconColor = showDisabledMinus
    ? colors.ink.divider
    : colors.ink.primary;
  const removeDisabled = showDisabledMinus;

  return (
    <View
      className="flex-row items-center border border-gray-200 bg-white"
      style={{ height: size, paddingHorizontal: 4, borderRadius: radius }}
    >
      <Pressable
        onPress={removeDisabled ? undefined : onRemove}
        disabled={removeDisabled}
        hitSlop={6}
        className="items-center justify-center"
        style={{ width: size - 8, height: size - 8 }}
      >
        <LeftIcon
          color={leftIconColor}
          size={iconSize}
          strokeWidth={iconStroke}
        />
      </Pressable>

      <Text
        className="text-center text-gray-900"
        style={{ minWidth: 16, fontSize: iconSize - 4 }}
      >
        {quantity}
      </Text>

      <Pressable
        onPress={onAdd}
        hitSlop={6}
        className="items-center justify-center"
        style={{ width: size - 8, height: size - 8 }}
      >
        <Plus
          color={colors.ink.primary}
          size={iconSize}
          strokeWidth={iconStroke}
        />
      </Pressable>
    </View>
  );
}
