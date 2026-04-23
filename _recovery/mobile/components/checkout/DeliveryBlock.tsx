import { View, Text, Pressable } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import type { CheckoutAddress } from '../../lib/checkout-context';

type Props = {
  address: CheckoutAddress | null;
  isInvalid?: boolean;
  onChange: () => void;
};

/**
 * Delivery address card shown when `orderType === 'delivery'`.
 *
 *   [ توصيل                                          ]
 *   [ البيت - بيت رقم ١٠١ - شارع صديق     [تغيير]  ]
 *
 * When no address is selected, shows a prompt instead.
 * Matches `delivery-block.tsx` from orders4.
 */
export function DeliveryBlock({ address, isInvalid = false, onChange }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <Pressable
      onPress={onChange}
      className="mx-4 rounded-2xl border bg-white p-4"
      style={{
        borderColor: isInvalid ? colors.state.danger : colors.ink.border,
      }}
    >
      {/* Title row */}
      <Text
        style={[localeDirStyle, isInvalid ? { color: colors.state.danger } : null]}
        className="text-start text-sm font-bold text-gray-900"
      >
        {t('checkout.block_delivery_title')}
      </Text>

      {/* Address row */}
      <View className="mt-2 flex-row items-center justify-between" style={{ gap: 12 }}>
        <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
          <MapPin color={colors.ink.tertiary} size={16} strokeWidth={2} />
          <Text
            style={localeDirStyle}
            className="flex-1 text-start text-xs text-gray-500"
            numberOfLines={1}
          >
            {address
              ? `${address.name} - ${address.address}`
              : t('checkout.block_delivery_empty')}
          </Text>
        </View>
        <Pressable
          onPress={onChange}
          className="rounded-xl border border-gray-200 px-3 py-1.5"
        >
          <Text className="text-xs text-gray-700">
            {address ? t('checkout.change') : t('checkout.select')}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
