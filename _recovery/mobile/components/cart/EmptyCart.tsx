import { Text, Pressable } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';

type Props = {
  onPressBrowse: () => void;
};

/**
 * Empty cart state — rendered when the cart has no lines. A
 * giant ShoppingBag icon, a two-line hint, and a Pressable
 * wrapper that sends the user to the stores directory.
 */
export function EmptyCart({ onPressBrowse }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <Pressable
      onPress={onPressBrowse}
      className="flex-1 items-center justify-center py-16"
    >
      <ShoppingBag
        color={colors.ink.border}
        size={128}
        strokeWidth={1}
      />
      <Text
        style={localeDirStyle}
        className="mt-6 text-base font-medium text-gray-600"
      >
        {t('cart.empty_title')}
      </Text>
      <Text
        style={localeDirStyle}
        className="mt-2 text-sm text-gray-500"
      >
        {t('cart.empty_subtitle')}
      </Text>
    </Pressable>
  );
}
