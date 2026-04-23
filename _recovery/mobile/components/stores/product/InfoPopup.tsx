import { View, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../../../lib/colors';
import { ModalShell } from '../../ui/ModalShell';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Max width in px for the centered card. Default 340. */
  maxWidth?: number;
};

/**
 * Small centered modal used by the product detail screen's info
 * popups (allergens, nutrition facts). A React Native Modal with
 * a dimmed backdrop that closes on tap, a single rounded card
 * floating in the center, and a close chip pinned to the top
 * inline-end corner of the card.
 *
 * Kept as a reusable primitive so the allergens and nutrition
 * popups share the same shell — only the body `children` differ.
 */
export function InfoPopup({
  visible,
  onClose,
  title,
  children,
  maxWidth = 340,
}: Props) {
  return (
    <ModalShell visible={visible} onClose={onClose} maxWidth={maxWidth}>
          <View className="relative">
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="absolute end-0 top-0 items-center justify-center rounded-full bg-white"
              style={{ width: 24, height: 24 }}
            >
              <X color={colors.ink.primary} size={14} strokeWidth={2.5} />
            </Pressable>

            {title ? (
              <Text className="mb-3 text-center text-sm text-gray-700">
                {title}
              </Text>
            ) : null}

            <View className="pt-2">{children}</View>
          </View>
    </ModalShell>
  );
}
