import { Pressable } from 'react-native';
import { colors } from '../../lib/colors';
import type { LucideIcon } from 'lucide-react-native';

type Props = {
  icon: LucideIcon;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
};

/**
 * Neutral icon button — same 40x40 rounded-xl footprint as
 * DeleteButton but with a white background and gray border
 * instead of the gray fill. Used for edit, link, and other
 * non-destructive icon actions alongside DeleteButton.
 */
export function IconButton({
  icon: Icon,
  onPress,
  size = 18,
  disabled = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      className="items-center justify-center rounded-xl border border-gray-200 bg-white"
      style={{ width: 40, height: 40, opacity: disabled ? 0.4 : 1 }}
    >
      <Icon color={colors.ink.tertiary} size={size} strokeWidth={1.5} />
    </Pressable>
  );
}
