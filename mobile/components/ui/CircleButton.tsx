import { Pressable, type ViewStyle, type StyleProp } from 'react-native';

type Props = {
  icon: React.ReactNode;
  onPress?: () => void;
  /** Outer diameter in px. Defaults to 36 (compact header size).
   *  Store hero uses 40 for larger touch targets on a photo. */
  size?: number;
  /** Extra style overrides for one-off tweaks. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared circular icon button used across every header bar and
 * hero overlay in the customer app. Single style — warm cream
 * pill (#F0F0F0), no border, rounded-full. Used in:
 *
 *   - StoreHero (search, share, back)
 *   - CompactHeader (search, share)
 *   - ProductHero (close, share)
 *   - ProductCompactHeader (close, share)
 *   - CartHeader (trash)
 *   - CheckoutHeader (back)
 *   - HeaderBar (back chevron)
 *
 * Matches `FavoriteButton` exactly — same bg color, same shape,
 * same sizing. The two components read as one visual family.
 */
export function CircleButton({
  icon,
  onPress,
  size = 36,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      className="items-center justify-center rounded-full"
      style={[
        {
          width: size,
          height: size,
          backgroundColor: '#F0F0F0',
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}
