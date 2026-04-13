import { View } from 'react-native';
import { PromoCard } from './PromoCard';
import type { Promo } from '../types';

type Props = {
  promos: Promo[] | undefined;
};

/**
 * Horizontal wrapper that lays out the two promo cards side by side
 * below the stats row. Renders nothing if the merchant has no
 * promos, so the screen degrades gracefully for merchants without
 * detail-tier mock data.
 *
 * Intentionally only renders the FIRST TWO promos — the reference
 * design always shows exactly two promo slots. If the backend ever
 * returns more we can revisit this.
 */
export function PromoCardRow({ promos }: Props) {
  if (!promos || promos.length === 0) return null;
  const visible = promos.slice(0, 2);

  return (
    <View className="mx-4 mt-4 flex-row" style={{ gap: 12 }}>
      {visible.map((promo) => (
        <PromoCard key={promo.id} promo={promo} />
      ))}
    </View>
  );
}
