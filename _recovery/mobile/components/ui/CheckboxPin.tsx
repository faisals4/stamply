import { View, Text } from 'react-native';
import { colors } from '../../lib/colors';

type Props = {
  selected: boolean;
  /** Outer width/height in px. Defaults to 22. */
  size?: number;
};

/**
 * Shared multi-select checkbox indicator. A rounded square that
 * fills with brand blue + shows a white checkmark when
 * `selected` is true; thin gray border when idle.
 *
 * Used in: Addons (checkbox groups). Extracted here alongside
 * `RadioPin` so the two pins live in the same `ui/` folder
 * and share the same sizing/color conventions.
 */
export function CheckboxPin({ selected, size = 22 }: Props) {
  return (
    <View
      className="items-center justify-center rounded-md border-2"
      style={{
        width: size,
        height: size,
        borderColor: selected ? colors.brand.DEFAULT : colors.ink.divider,
        backgroundColor: selected ? colors.brand.DEFAULT : 'transparent',
      }}
    >
      {selected ? (
        <Text className="text-xs font-bold text-white">✓</Text>
      ) : null}
    </View>
  );
}
