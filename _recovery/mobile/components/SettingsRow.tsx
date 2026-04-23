import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useIsRTL } from '../lib/rtl';
import { colors } from '../lib/colors';
import { surfaces } from '../lib/surfaces';
import type { LucideIcon } from 'lucide-react-native';

type Props = {
  /** Lucide icon component shown at the inline-start. */
  icon: LucideIcon;
  /** Icon color override — defaults to ink.secondary. */
  iconColor?: string;
  /** Row label text. */
  label: string;
  /** Optional subtitle shown below the label in smaller gray text. */
  subtitle?: string;
  /** Override subtitle text color (defaults to gray-400). */
  subtitleColor?: string;
  /** Optional value shown before the chevron (e.g. "العربية"). */
  value?: string;
  /** When true, renders with danger colors (red icon + red bold text). */
  destructive?: boolean;
  /** Hide the trailing drill chevron. */
  hideChevron?: boolean;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * Shared settings/menu row — a full-width card with:
 *
 *   [icon]  label              [value]  [›]
 *
 * Replaces the 4+ identical inline `<Pressable className="...surfaces.card...
 * flex-row...">` patterns in the Settings screen. Also reusable for
 * any future "list of actions" screen (profile, about, privacy, etc.).
 */
export function SettingsRow({
  icon: Icon,
  iconColor,
  label,
  subtitle,
  subtitleColor,
  value,
  destructive = false,
  hideChevron = false,
  onPress,
  disabled = false,
}: Props) {
  const isRTL = useIsRTL();
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const resolvedIconColor = destructive
    ? colors.state.danger
    : iconColor ?? colors.ink.secondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`mx-4 mt-4 flex-row items-center justify-between ${surfaces.card} p-4`}
    >
      <View className="flex-row items-center flex-1">
        <Icon color={resolvedIconColor} size={20} strokeWidth={0.9} />
        <View className="ms-3 flex-1">
          <Text
            className={
              destructive
                ? 'text-base font-semibold text-red-500'
                : 'text-base text-gray-900'
            }
          >
            {label}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-gray-400" numberOfLines={1} style={subtitleColor ? { color: subtitleColor } : undefined}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {!hideChevron ? (
        <View className="flex-row items-center">
          {value ? (
            <Text className="me-2 text-sm text-gray-500">{value}</Text>
          ) : null}
          <Chevron color={colors.ink.tertiary} size={18} strokeWidth={0.9} />
        </View>
      ) : null}
    </Pressable>
  );
}
