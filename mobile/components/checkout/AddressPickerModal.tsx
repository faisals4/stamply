import { View, Text, Pressable, ScrollView } from 'react-native';
import { X, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { RadioPin } from '../ui/RadioPin';
import { ModalShell } from '../ui/ModalShell';
import type { CheckoutAddress } from '../../lib/checkout-context';

type Props = {
  visible: boolean;
  addresses: CheckoutAddress[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (address: CheckoutAddress) => void;
};

/**
 * Bottom-sheet style modal with a scrollable list of saved
 * addresses. Each row is a radio-style card — tapping it
 * immediately fires `onSelect` and closes the modal.
 *
 * The currently-selected address is highlighted with a brand-blue
 * border + filled dot so the user can see their current choice
 * at a glance.
 *
 * Reuses the same RN `Modal` + dimmed backdrop pattern as
 * `ConfirmModal` and `InfoPopup` — three copies of the same
 * pattern is still cheaper than a shared primitive when each
 * variant has different body layouts.
 */
export function AddressPickerModal({
  visible,
  addresses,
  selectedId,
  onClose,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <ModalShell visible={visible} onClose={onClose} maxWidth={400} maxHeight="80%">
          {/* Header row: title + close chip. */}
          <View
            className="mb-4 flex-row items-center justify-between"
            style={{ gap: 8 }}
          >
            <Text
              style={localeDirStyle}
              className="flex-1 text-start text-base font-bold text-gray-900"
            >
              {t('checkout.address_picker_title')}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="items-center justify-center rounded-full bg-gray-100"
              style={{ width: 28, height: 28 }}
            >
              <X color={colors.ink.primary} size={16} strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {addresses.map((addr) => {
              const isSelected = addr.id === selectedId;
              return (
                <Pressable
                  key={addr.id}
                  onPress={() => {
                    onSelect(addr);
                    onClose();
                  }}
                  className="flex-row items-center rounded-2xl border p-3"
                  style={{
                    gap: 10,
                    borderColor: isSelected
                      ? colors.brand.DEFAULT
                      : colors.ink.border,
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <RadioPin selected={isSelected} />

                  <MapPin
                    color={colors.ink.tertiary}
                    size={18}
                    strokeWidth={2}
                  />

                  <View className="flex-1">
                    <Text
                      style={localeDirStyle}
                      className="text-start text-sm font-medium text-gray-900"
                      numberOfLines={1}
                    >
                      {addr.name}
                    </Text>
                    <Text
                      style={localeDirStyle}
                      className="mt-0.5 text-start text-xs text-gray-500"
                      numberOfLines={2}
                    >
                      {addr.address}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
    </ModalShell>
  );
}
