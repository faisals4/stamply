import { View, Text, Pressable } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { ModalShell } from '../ui/ModalShell';

type Props = {
  visible: boolean;
  orderNumber: string;
  onClose: () => void;
};

/**
 * Centered confirmation popup shown after a successful order
 * submission. A large green check icon, a "shukrun" headline,
 * the mock order number, and a single primary button that closes
 * the modal and pops the user back to the stores directory.
 *
 * Stateless — the parent owns `visible` + the generated order
 * number and is responsible for clearing the cart on close.
 */
export function OrderSuccessModal({ visible, orderNumber, onClose }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <ModalShell visible={visible} onClose={onClose}>
        <View className="items-center">
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: 72,
              height: 72,
              backgroundColor: '#ECFDF5',
            }}
          >
            <CheckCircle2
              color={colors.state.success}
              size={40}
              strokeWidth={2}
            />
          </View>

          <Text
            style={localeDirStyle}
            className="mt-4 text-center text-lg font-bold text-gray-900"
          >
            {t('checkout.success_title')}
          </Text>
          <Text
            style={localeDirStyle}
            className="mt-1 text-center text-sm text-gray-500"
          >
            {t('checkout.success_subtitle')}
          </Text>

          {/* Order number chip. */}
          <View
            className="mt-4 rounded-2xl bg-gray-100 px-4 py-2"
          >
            <Text className="text-center text-sm font-bold text-gray-900">
              #{orderNumber}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            className="mt-5 w-full items-center justify-center rounded-2xl"
            style={{
              height: 48,
              backgroundColor: colors.brand.DEFAULT,
            }}
          >
            <Text className="text-sm text-white">
              {t('checkout.success_close')}
            </Text>
          </Pressable>
        </View>
    </ModalShell>
  );
}
