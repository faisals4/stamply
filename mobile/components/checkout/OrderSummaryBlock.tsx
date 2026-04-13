import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { Price } from '../stores/detail/Price';

type Props = {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  /** Total = subtotal + deliveryFee - discount. Computed by the
   *  parent so the display and the bottom-bar CTA stay in sync. */
  total: number;
};

/**
 * Line-by-line order totals shown in the checkout stack:
 *
 *   المجموع الفرعي              X.XX ﷼
 *   رسوم التوصيل                 Y.YY ﷼
 *   الخصم                       -Z.ZZ ﷼
 *   ──────────────────────────
 *   الإجمالي                     T.TT ﷼
 *   شامل ضريبة القيمة المضافة*
 *
 * All amounts flow through `<Price>` so the Saudi Riyal glyph
 * renders uniformly (and the `5.00` two-decimal formatting
 * applies everywhere).
 */
export function OrderSummaryBlock({
  subtotal,
  deliveryFee,
  discount,
  total,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View className="mx-4 rounded-2xl border border-gray-200 bg-white p-4">
      <Row
        label={t('checkout.summary_subtotal')}
        value={<Price amount={subtotal} size={13} />}
      />
      <Row
        label={t('checkout.summary_delivery_fee')}
        value={<Price amount={deliveryFee} size={13} />}
      />
      {discount > 0 ? (
        <Row
          label={t('checkout.summary_discount')}
          value={
            <Price
              amount={discount}
              size={13}
              color={colors.state.danger}
            />
          }
        />
      ) : null}

      <View
        className="my-3"
        style={{ height: 1, backgroundColor: colors.ink.softBorder }}
      />

      <View
        className="flex-row items-center justify-between"
        style={{ gap: 8 }}
      >
        <Text
          style={localeDirStyle}
          className="flex-1 text-start text-sm font-bold text-gray-900"
        >
          {t('checkout.summary_total')}
        </Text>
        <Price amount={total} size={14} bold />
      </View>

      <Text
        style={localeDirStyle}
        className="mt-2 text-start text-3xs text-gray-400"
      >
        {t('checkout.summary_vat_note')}
      </Text>

      {/* Tax registration number + certificate link. */}
      <View className="mt-3 items-center" style={{ gap: 4 }}>
        <Text className="text-center text-3xs text-gray-400">
          {t('checkout.tax_number')}
        </Text>
        <Pressable hitSlop={6}>
          <Text
            className="text-center text-3xs"
            style={{ color: colors.ink.secondary }}
          >
            {t('checkout.view_certificate')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Single `label ... value` row used three times in the summary
 * block. Kept as a local subcomponent so the surrounding file
 * stays readable.
 */
function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View
      className="mb-1 flex-row items-center justify-between"
      style={{ gap: 8 }}
    >
      <Text
        style={localeDirStyle}
        className="flex-1 text-start text-sm text-gray-500"
      >
        {label}
      </Text>
      {value}
    </View>
  );
}
