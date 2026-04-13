import { View } from 'react-native';
import { colors } from '../../lib/colors';

type Props = {
  selected: boolean;
  /** Outer diameter in px. Defaults to 22. */
  size?: number;
};

/**
 * Shared single-select radio indicator. A circle that fills with
 * brand blue + shows a centered white dot when `selected` is
 * true; thin gray border when idle.
 *
 * Used in: Addons (radio groups), AddressPickerModal,
 * TimeSelectionBlock, PaymentMethodBlock.
 *
 * Before this component, each of those files defined its own
 * inline 10-line View block with the exact same styling. Now
 * they all import one 15-line primitive.
 */
export function RadioPin({ selected, size = 22 }: Props) {
  const innerSize = Math.round(size * 0.36);
  return (
    <View
      className="items-center justify-center rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: selected ? colors.brand.DEFAULT : colors.ink.divider,
        backgroundColor: selected ? colors.brand.DEFAULT : 'transparent',
      }}
    >
      {selected ? (
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: colors.white,
          }}
        />
      ) : null}
    </View>
  );
}
