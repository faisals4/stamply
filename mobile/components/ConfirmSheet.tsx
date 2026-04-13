import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { BottomSheet } from './BottomSheet';
import { colors } from '../lib/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Tint for the confirm button + header icon. Defaults to red (destructive). */
  destructive?: boolean;
  icon?: LucideIcon;
  loading?: boolean;
};

/**
 * Reusable confirmation modal — used for destructive or
 * irreversible actions like logout. Composes the shared
 * `<BottomSheet>` primitive so the dim/slide animation, max-width
 * clamp, and backdrop tap-to-close behaviour all live in one place.
 *
 * The body is a fixed-height column with an optional header icon,
 * a title, an optional message, and a stacked confirm/cancel button
 * pair. There's no drag handle — closing happens via the backdrop
 * tap or the cancel button.
 */
export function ConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  icon: Icon,
  loading,
}: Props) {
  const tint = destructive ? '#DC2626' : '#eb592e';
  const tintBg = destructive ? '#FEE2E2' : '#E0F2FE';

  return (
    <BottomSheet visible={visible} onClose={onClose} align="bottom">
      <View className="px-6 pt-6 pb-6 items-center">
        {Icon ? (
          <View
            style={{ backgroundColor: tintBg }}
            className="h-14 w-14 items-center justify-center rounded-full mb-4"
          >
            <Icon color={tint} size={26} />
          </View>
        ) : null}

        <Text className="text-xl font-bold text-gray-900 text-center">
          {title}
        </Text>
        {message ? (
          <Text className="mt-2 text-center text-sm leading-6 text-gray-500">
            {message}
          </Text>
        ) : null}

        <View className="mt-6 w-full gap-3">
          <Pressable
            onPress={onConfirm}
            disabled={loading}
            style={{ backgroundColor: tint, opacity: loading ? 0.6 : 1 }}
            className="h-12 items-center justify-center rounded-2xl"
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-base font-semibold text-white">
                {confirmLabel}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={onClose}
            disabled={loading}
            className="h-12 items-center justify-center rounded-2xl border border-gray-300"
          >
            <Text className="text-base font-semibold text-gray-700">
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}
