import { View, Text, Pressable } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import type { CheckoutAddress } from '../../lib/checkout-context';

type Props = {
  address: CheckoutAddress | null;
  onChange: () => void;
  /** When true, the block renders with a red border + red title
   *  to surface a validation failure ("select an address"). */
  isInvalid?: boolean;
};

/**
 * Delivery-address card shown in the checkout stack. Two states:
 *
 *   - Unset: a single-line prompt "اختر عنوان التوصيل" + a
 *     right-aligned "اختيار" link button.
 *   - Set: the address name + full address stacked on the left,
 *     with a "تغيير" link on the right.
 *
 * Tapping anywhere on the card (the whole thing is a Pressable)
 * opens the address picker modal — the parent owns the modal.
 */
export function DeliveryAddressBlock({
  address,
  onChange,
  isInvalid = false,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <Pressable
      onPress={onChange}
      className="mx-4 flex-row items-center rounded-2xl border bg-white p-4"
      style={{
        gap: 12,
        borderColor: isInvalid ? colors.state.danger : colors.ink.border,
      }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: 40,
          height: 40,
          backgroundColor: '#F3F4F6',
        }}
      >
        <MapPin
          color={isInvalid ? colors.state.danger : colors.brand.DEFAULT}
          size={18}
          strokeWidth={2}
        />
      </View>

      <View className="flex-1">
        <Text
          style={[
            localeDirStyle,
            isInvalid ? { color: colors.state.danger } : null,
          ]}
          className="text-start text-sm font-bold text-gray-900"
          numberOfLines={1}
        >
          {address
            ? address.name
            : t('checkout.delivery_address_empty_title')}
        </Text>
        <Text
          style={localeDirStyle}
          className="mt-0.5 text-start text-xs text-gray-500"
          numberOfLines={1}
        >
          {address
            ? address.address
            : t('checkout.delivery_address_empty_subtitle')}
        </Text>
      </View>

      <Text
        className="text-xs font-medium"
        style={{ color: colors.brand.DEFAULT }}
      >
        {address ? t('checkout.change') : t('checkout.select')}
      </Text>
    </Pressable>
  );
}
