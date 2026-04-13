import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import { colors } from '../../lib/colors';
import { HeaderBar } from '../ui/HeaderBar';
import { CircleButton } from '../ui/CircleButton';

type Props = {
  onBack: () => void;
  onClearCart?: () => void;
};

/**
 * Cart-screen header — delegates to `HeaderBar` for the back
 * button + centered "السلة" title. The only custom piece is the
 * optional trash icon at the inline-end edge for clearing the
 * entire cart; when `onClearCart` is undefined (empty cart), the
 * HeaderBar renders its default blank placeholder so the title
 * stays centered.
 */
export function CartHeader({ onBack, onClearCart }: Props) {
  const { t } = useTranslation();

  return (
    <HeaderBar
      title={t('cart.title')}
      onBack={onBack}
      endAction={
        onClearCart ? (
          <CircleButton
            onPress={onClearCart}
            icon={<Trash2 color={colors.navIcon} size={18} strokeWidth={2} />}
          />
        ) : undefined
      }
    />
  );
}
