import { useTranslation } from 'react-i18next';
import { HeaderBar } from '../ui/HeaderBar';

type Props = {
  onBack: () => void;
};

/**
 * Checkout-screen header — a thin wrapper around `HeaderBar` with
 * the "إتمام الطلب" title and no end-action. No custom logic —
 * exists as a named export so the checkout route file reads
 * cleanly without importing generic primitives directly.
 */
export function CheckoutHeader({ onBack }: Props) {
  const { t } = useTranslation();
  return <HeaderBar title={t('checkout.title')} onBack={onBack} />;
}
