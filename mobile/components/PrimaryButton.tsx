import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors } from '../lib/colors';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  /** Optional icon rendered before the label. */
  icon?: React.ReactNode;
  /** Override the primary background color (e.g. '#eb592e' for Stamply blue). */
  color?: string;
};

/**
 * Single source of truth for every CTA button in the app —
 * login, verify, profile edit (save/cancel), wallet add,
 * merchant create card/location, etc.
 *
 * Consumers pick between `primary` (solid brand orange) and
 * `ghost` (outlined neutral). Pass `icon` to render an icon
 * before the label (e.g. a + icon for create buttons).
 */
export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  color,
}: Props) {
  const isGhost = variant === 'ghost';
  const isDisabled = disabled || loading;
  const bgColor = color ?? colors.brand.DEFAULT;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={
        (isGhost
          ? 'h-12 flex-row items-center justify-center rounded-2xl border border-gray-300 px-4'
          : 'h-12 flex-row items-center justify-center rounded-2xl px-4') +
        (isDisabled ? ' opacity-50' : '')
      }
      style={[
        !isGhost ? { backgroundColor: bgColor } : undefined,
        icon ? { gap: 6 } : undefined,
      ] as any}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? bgColor : colors.white} />
      ) : (
        <>
          {icon}
          <Text
            className={isGhost ? 'text-base' : 'text-base text-white'}
            style={isGhost ? { color: bgColor } : undefined}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
