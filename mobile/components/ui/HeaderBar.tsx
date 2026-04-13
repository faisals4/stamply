import { View, Text, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useIsRTL } from '../../lib/rtl';
import { colors } from '../../lib/colors';
import { CircleButton } from './CircleButton';

type Props = {
  title: string;
  /** Optional subtitle shown below the title in smaller gray text. */
  subtitle?: string;
  onBack: () => void;
  /** Override the default back-chevron icon. */
  backIcon?: React.ReactNode;
  /** Optional action rendered at the inline-end edge. */
  endAction?: React.ReactNode;
};

const BUTTON_SIZE = 36;

/**
 * Shared header bar used by every detail/modal screen:
 *
 *   [ ← back ]       [ Title ]       [ endAction ]
 *     ^ inline-start    center         ^ inline-end
 *
 * Before this component, `CartHeader`, `CheckoutHeader`,
 * `CompactHeader`, and `ProductCompactHeader` each defined their
 * own header row with identical heights (56 px), back-button
 * sizes (36 px CircleButton), and centering logic. Now they all
 * compose `HeaderBar` and only supply `title` + `endAction`.
 *
 * The back chevron flips direction via `useIsRTL` so it always
 * points in the natural "back" direction of the reading order.
 */
export function HeaderBar({ title, subtitle, onBack, backIcon, endAction }: Props) {
  const isRTL = useIsRTL();
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;
  const defaultBackIcon = <BackIcon color={colors.navIcon} size={20} strokeWidth={2} />;

  return (
    <View
      className="flex-row items-center border-b border-gray-100 px-4"
      style={[
        {
          height: 56,
          gap: 12,
          // Semi-transparent so the backdrop blur can show content
          // scrolling underneath. 85% opacity keeps the bar readable
          // while letting the frosted-glass effect come through.
          backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.90)' : colors.page,
        },
        Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            } as any)
          : null,
      ]}
    >
      {/* Title centered absolutely so it stays perfectly centered
           regardless of back button / endAction width differences */}
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <Text
          className="text-center text-base font-bold text-gray-900"
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-center text-3xs text-gray-400" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <CircleButton
        onPress={onBack}
        icon={backIcon ?? defaultBackIcon}
      />

      <View className="flex-1" />

      {endAction ?? (
        <View style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }} />
      )}
    </View>
  );
}
