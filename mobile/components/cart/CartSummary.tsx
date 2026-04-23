import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { Price } from '../stores/detail/Price';

export type AppliedCouponInfo = {
  code: string;
  label: string;
};

type Props = {
  totalPrice: number;
  itemCount: number;
  appliedCoupon: AppliedCouponInfo | null;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
  couponLoading: boolean;
  couponError: string;
  couponSuccess: string;
  /** Kept as a controlled string so the parent can reset it after
   *  a successful application. */
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  /** Optional explicit discount amount to render inline above the
   *  total. Defaults to 0 (no discount row shown). */
  discountAmount?: number;
};

/**
 * Two-block summary card shown below the cart item list:
 *
 *   1. Collapsible coupon block — tap the header to reveal an
 *      input + apply button. Handles both unapplied and applied
 *      states (check badge + remove link).
 *
 *   2. Totals block — subtotal line + optional discount line +
 *      divider + total line in bold. Every amount flows through
 *      `<Price>` so the Saudi Riyal glyph renders uniformly.
 */
export function CartSummary({
  totalPrice,
  itemCount,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  couponLoading,
  couponError,
  couponSuccess,
  couponCode,
  onCouponCodeChange,
  discountAmount = 0,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const [couponOpen, setCouponOpen] = useState(false);

  const finalTotal = Math.max(0, totalPrice - discountAmount);

  return (
    <View style={{ gap: 12 }}>
      {/* ─── Coupon block ─── */}
      <View className="mx-4 rounded-2xl border border-gray-200 bg-white p-3">
        {!appliedCoupon ? (
          <>
            <Pressable
              onPress={() => setCouponOpen((v) => !v)}
              className="w-full flex-row items-center justify-between"
              style={{ gap: 8 }}
            >
              <Text
                style={localeDirStyle}
                className="flex-1 text-start text-sm font-medium text-gray-900"
              >
                {t('cart.coupon_question')}
              </Text>
              {couponOpen ? (
                <ChevronUp color={colors.ink.tertiary} size={16} strokeWidth={2} />
              ) : (
                <ChevronDown
                  color={colors.ink.tertiary}
                  size={16}
                  strokeWidth={2}
                />
              )}
            </Pressable>

            {couponOpen ? (
              <View className="mt-3">
                <View className="flex-row" style={{ gap: 8 }}>
                  <TextInput
                    value={couponCode}
                    onChangeText={onCouponCodeChange}
                    placeholder={t('cart.coupon_placeholder') as string}
                    placeholderTextColor={colors.ink.tertiary}
                    editable={!couponLoading}
                    className="flex-1 rounded-2xl bg-gray-100 px-3 text-sm text-gray-900"
                    style={[
                      localeDirStyle,
                      // `minWidth: 0` is required on react-native-web so
                      // the flex-1 TextInput can shrink below the
                      // placeholder's intrinsic width. Without it the
                      // input enforces `min-width: auto` and pushes
                      // the adjacent Apply button past the card's
                      // inline-end edge.
                      {
                        height: 44,
                        minWidth: 0,
                        outlineStyle: 'none',
                      } as any,
                    ]}
                    autoCapitalize="characters"
                  />
                  <Pressable
                    onPress={() => onApplyCoupon(couponCode)}
                    disabled={!couponCode.trim() || couponLoading}
                    className="items-center justify-center rounded-2xl px-4"
                    style={{
                      height: 44,
                      backgroundColor: colors.brand.DEFAULT,
                      opacity: !couponCode.trim() || couponLoading ? 0.4 : 1,
                    }}
                  >
                    {couponLoading ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text className="text-sm text-white">
                        {t('cart.coupon_apply')}
                      </Text>
                    )}
                  </Pressable>
                </View>
                {couponError ? (
                  <Text
                    style={[localeDirStyle, { color: colors.state.danger }]}
                    className="mt-2 text-start text-xs"
                  >
                    {couponError}
                  </Text>
                ) : null}
                {couponSuccess ? (
                  <Text
                    style={[localeDirStyle, { color: colors.state.success }]}
                    className="mt-2 text-start text-xs"
                  >
                    {couponSuccess}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <View
            className="flex-row items-center justify-between"
            style={{ gap: 8 }}
          >
            <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: colors.state.success,
                }}
              >
                <Check color={colors.white} size={14} strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text
                  style={[localeDirStyle, { color: colors.state.success }]}
                  className="text-start text-sm font-medium"
                >
                  {appliedCoupon.code}
                </Text>
                <Text
                  style={[localeDirStyle, { color: colors.state.success }]}
                  className="text-start text-xs"
                >
                  {appliedCoupon.label}
                </Text>
              </View>
            </View>
            <Pressable onPress={onRemoveCoupon} hitSlop={6}>
              <Text
                className="text-xs"
                style={{ color: colors.state.danger }}
              >
                {t('cart.coupon_remove')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ─── Totals block ─── */}
      <View className="mx-4 rounded-2xl border border-gray-200 bg-white p-3">
        <View
          className="flex-row items-center justify-between"
          style={{ gap: 8 }}
        >
          <Text
            style={localeDirStyle}
            className="flex-1 text-start text-sm text-gray-500"
          >
            {t('cart.subtotal', { count: itemCount })}
          </Text>
          <Price amount={Number(totalPrice.toFixed(2))} size={13} />
        </View>

        {discountAmount > 0 ? (
          <View
            className="mt-1 flex-row items-center justify-between"
            style={{ gap: 8 }}
          >
            <Text
              style={localeDirStyle}
              className="flex-1 text-start text-sm"
              // Discount line uses the danger color to read as
              // "money off the subtotal".
              // eslint-disable-next-line react-native/no-inline-styles
              // @ts-expect-error color override via style
              lightColor={colors.state.danger}
            >
              {t('cart.discount')}
            </Text>
            <Price
              amount={Number(discountAmount.toFixed(2))}
              size={13}
              color={colors.state.danger}
            />
          </View>
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
            {t('cart.total')}
          </Text>
          <Price amount={Number(finalTotal.toFixed(2))} size={14} bold />
        </View>
      </View>
    </View>
  );
}
