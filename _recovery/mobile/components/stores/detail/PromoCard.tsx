import { View, Text } from 'react-native';
import { Bike, BadgePercent } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { colors } from '../../../lib/colors';
import { Price } from './Price';
import type { Promo } from '../types';

type Props = {
  promo: Promo;
};

/**
 * Single promo banner shown in a pair above the category tabs. The
 * `promo.kind` discriminant decides which variant renders:
 *
 *   - delivery_discount: blue Bike icon + brand-blue headline,
 *     "رسوم التوصيل", min-order sub line.
 *   - item_discount: red BadgePercent + danger-red headline,
 *     "{percent}% خصم", scope sub line, optional no-min sub line.
 *
 * Both variants share the same card skeleton (gray-50 background,
 * rounded-2xl, dashed divider, "مفعل تلقائيا" footer) so the two
 * cards read as a matching pair even though their accent colors
 * differ.
 *
 * All text lines use `text-start` + an explicit writingDirection so
 * the Arabic copy is logical-start aligned (right in RTL, left in
 * LTR) to match the reference design, regardless of what
 * react-native-web's per-Text Arabic auto-detection would do.
 */
export function PromoCard({ promo }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  if (promo.kind === 'delivery_discount') {
    return (
      <PromoCardShell>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Bike color={colors.brand.DEFAULT} size={18} strokeWidth={2} />
          {/* Discounted fee — Price renders the Saudi Riyal glyph
              in the same brand-blue as the surrounding text. */}
          <Price
            amount={promo.fee}
            size={14}
            color={colors.brand.DEFAULT}
            bold
          />
        </View>
        <Text
          style={[localeDirStyle, { color: colors.brand.DEFAULT }]}
          className="mt-1 text-start text-sm font-bold"
        >
          {t('store_detail.delivery_promo_title')}
        </Text>
        {/* "الحد الأدنى: [price]" — the prefix string is a flex
            sibling of the Price component so the glyph follows the
            number seamlessly, and the whole row flips naturally
            with RTL/LTR. */}
        <View
          className="mt-1 flex-row items-center"
          style={{ gap: 4 }}
        >
          <Text
            style={localeDirStyle}
            className="text-start text-xs text-gray-500"
          >
            {t('store_detail.delivery_promo_min_prefix')}
          </Text>
          <Price
            amount={promo.minOrder}
            size={12}
            color={colors.ink.secondary}
          />
        </View>
        <PromoFooter />
      </PromoCardShell>
    );
  }

  // item_discount variant
  return (
    <PromoCardShell>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <BadgePercent color={colors.state.danger} size={18} strokeWidth={2} />
      </View>
      <Text
        style={[localeDirStyle, { color: colors.state.danger }]}
        className="mt-1 text-start text-sm font-bold"
      >
        {t('store_detail.discount_promo_title', { percent: promo.percent })}
      </Text>
      <Text
        style={[localeDirStyle, { color: colors.state.danger }]}
        className="mt-0.5 text-start text-xs"
      >
        {t('store_detail.discount_promo_scope', { scope: promo.scope })}
      </Text>
      {!promo.hasMin ? (
        <Text
          style={localeDirStyle}
          className="mt-1 text-start text-xs text-gray-500"
        >
          {t('store_detail.discount_promo_no_min')}
        </Text>
      ) : null}
      <PromoFooter />
    </PromoCardShell>
  );
}

/**
 * Shared card skeleton — gray-50 surface, rounded corners, fixed
 * padding and flex-1 so the two promo cards in a row share the
 * available width evenly.
 */
function PromoCardShell({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 rounded-2xl bg-gray-50 p-3">
      {children}
    </View>
  );
}

/**
 * Dashed divider + "مفعل تلقائيا" caption shared by both promo
 * variants. Pulled out so the two variants read as visually
 * identical at the footer.
 */
function PromoFooter() {
  const { t } = useTranslation();
  return (
    <>
      <View
        className="my-2 border-t border-dashed border-gray-200"
        style={{ borderStyle: 'dashed' }}
      />
      <Text className="text-center text-xs text-gray-400">
        {t('store_detail.promo_auto_applied')}
      </Text>
    </>
  );
}
