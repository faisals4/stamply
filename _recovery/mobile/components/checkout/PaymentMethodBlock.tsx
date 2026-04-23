import { View, Text, Pressable } from 'react-native';
import { Banknote, CreditCard, Apple } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { RadioPin } from '../ui/RadioPin';
import type { CheckoutPaymentMethod } from '../../lib/checkout-context';

type Props = {
  value: CheckoutPaymentMethod | null;
  onChange: (next: CheckoutPaymentMethod) => void;
  /** When true, the block renders with a red title to surface a
   *  validation failure ("pick a payment method"). */
  isInvalid?: boolean;
};

const METHODS: Array<{
  id: CheckoutPaymentMethod;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  labelKey: string;
}> = [
  { id: 'cash', icon: Banknote, labelKey: 'checkout.payment_cash' },
  { id: 'card', icon: CreditCard, labelKey: 'checkout.payment_card' },
  { id: 'apple_pay', icon: Apple, labelKey: 'checkout.payment_apple_pay' },
];

/**
 * Three stacked payment-method rows: Cash, Card, Apple Pay. Each
 * row is a radio-style card with an icon, the label, and a
 * circular pin on the inline-end edge that fills with brand blue
 * when selected.
 *
 * Stateless — the parent screen holds the chosen method in
 * `CheckoutContext` and passes the current value / setter here.
 * All three options are mock only; tapping "card" doesn't open a
 * payment sheet in this first pass.
 */
export function PaymentMethodBlock({
  value,
  onChange,
  isInvalid = false,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View className="mx-4" style={{ gap: 10 }}>
      <Text
        style={[
          localeDirStyle,
          isInvalid ? { color: colors.state.danger } : null,
        ]}
        className="text-start text-sm font-bold text-gray-900"
      >
        {t('checkout.payment_block_title')}
      </Text>

      <View style={{ gap: 8 }}>
        {METHODS.map((method) => {
          const isSelected = value === method.id;
          const Icon = method.icon;
          return (
            <Pressable
              key={method.id}
              onPress={() => onChange(method.id)}
              className="flex-row items-center rounded-2xl border bg-white p-3"
              style={{
                gap: 12,
                borderColor: isSelected
                  ? colors.brand.DEFAULT
                  : colors.ink.border,
              }}
            >
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: '#F3F4F6',
                }}
              >
                <Icon
                  color={colors.ink.primary}
                  size={18}
                  strokeWidth={2}
                />
              </View>

              <Text
                style={localeDirStyle}
                className="flex-1 text-start text-sm font-medium text-gray-900"
              >
                {t(method.labelKey)}
              </Text>

              <RadioPin selected={isSelected} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
