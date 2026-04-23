import { View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../lib/colors';
import { Price } from './Price';
import type { Store } from '../types';

type Props = {
  store: Store;
};

/**
 * Three-column stats row rendered between the info card and the
 * promo cards. Column order follows the reference design and flips
 * naturally with RTL/LTR document direction:
 *
 *   [Min order] [Delivery time + shield] [Delivery fee]
 *
 * In Arabic the first column appears on the right edge. In English
 * it appears on the left edge. No per-locale branching needed — the
 * `flex-row` wrapper inherits document direction from the page.
 *
 * The middle column adds a small green `ShieldCheck` icon next to
 * the value to indicate Stamply-verified delivery time, matching
 * the badge seen in the reference video.
 *
 * Currency values render via `<Price>` which uses the official
 * Saudi Riyal glyph (lucide `SaudiRiyal`) instead of the literal
 * "ر.س" text.
 */
export function StoreStatsRow({ store }: Props) {
  const { t } = useTranslation();

  const minOrder = store.minOrder ?? 0;
  const deliveryTime = store.deliveryTime;
  const deliveryFee = store.deliveryFee ?? 0;

  return (
    <View className="mx-4 mt-4 flex-row items-start justify-between">
      <StatColumn
        label={t('store_detail.min_order')}
        value={<Price amount={minOrder} size={14} bold />}
      />
      <StatColumn
        label={t('store_detail.delivery_time')}
        value={
          <Text className="text-center text-sm font-semibold text-gray-900">
            {deliveryTime
              ? `${deliveryTime.min} - ${deliveryTime.max} ${t('store_detail.minutes')}`
              : '—'}
          </Text>
        }
        trailingIcon={
          <ShieldCheck
            color={colors.state.success}
            size={14}
            strokeWidth={2}
          />
        }
      />
      <StatColumn
        label={t('store_detail.delivery_fee')}
        value={<Price amount={deliveryFee} size={14} bold />}
      />
    </View>
  );
}

/**
 * Single column inside the stats row. `value` is a ReactNode (not
 * a string) so callers can pass either a plain `<Text>` (delivery
 * time) or a `<Price>` component (min order / delivery fee).
 */
function StatColumn({
  label,
  value,
  trailingIcon,
}: {
  label: string;
  value: React.ReactNode;
  trailingIcon?: React.ReactNode;
}) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-center text-xs text-gray-400">{label}</Text>
      <View className="mt-1 flex-row items-center" style={{ gap: 4 }}>
        {value}
        {trailingIcon}
      </View>
    </View>
  );
}
