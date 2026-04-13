import { View, Text, Pressable } from 'react-native';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { ModalShell } from '../ui/ModalShell';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** When true, the confirm button renders in danger-red (used for
   *  destructive actions like "remove item" / "clear cart"). */
  destructive?: boolean;
};

/**
 * Shared confirmation dialog — a tiny centered modal with a
 * dimmed backdrop, a bold title, a description sentence, and
 * cancel/confirm buttons at the bottom.
 *
 * Used by the cart screen for two destructive flows (remove line,
 * clear cart) so the two prompts stay visually consistent. Not
 * placed inside `components/stores/product/InfoPopup.tsx` because
 * that file is focused on read-only info popups with no action
 * buttons — confirmations warrant their own primitive.
 */
export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
}: Props) {
  const localeDirStyle = useLocaleDirStyle();

  return (
    <ModalShell visible={visible} onClose={onClose} maxWidth={320}>
          <Text
            style={localeDirStyle}
            className="text-start text-base font-bold text-gray-900"
          >
            {title}
          </Text>
          <Text
            style={localeDirStyle}
            className="mt-2 text-start text-sm text-gray-500"
          >
            {description}
          </Text>

          {/* Action row. `flex-1` on both buttons splits the width
              evenly; the order matches the document direction so
              cancel always sits at the inline-start edge. */}
          <View className="mt-5 flex-row" style={{ gap: 10 }}>
            <Pressable
              onPress={onClose}
              className="flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white"
              style={{ height: 44 }}
            >
              <Text className="text-sm text-gray-900">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 items-center justify-center rounded-2xl"
              style={{
                height: 44,
                backgroundColor: destructive
                  ? colors.state.danger
                  : colors.brand.DEFAULT,
              }}
            >
              <Text className="text-sm text-white">{confirmLabel}</Text>
            </Pressable>
          </View>
    </ModalShell>
  );
}
