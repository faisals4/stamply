import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCart } from '../../lib/cart-context';
import { ScreenContainer } from '../ScreenContainer';
import { STORES } from '../stores/data';
import type { Product } from '../stores/types';
import { ProductCrossSelling } from '../stores/product/ProductCrossSelling';

import { CartHeader } from './CartHeader';
import { FreeDeliveryBanner } from './FreeDeliveryBanner';
import { CartItemList, type CartLine } from './CartItemList';
import { CartSummary, type AppliedCouponInfo } from './CartSummary';
import { CartBottomBar } from './CartBottomBar';
import { EmptyCart } from './EmptyCart';
import { ConfirmModal } from './ConfirmModal';

const FREE_DELIVERY_THRESHOLD = 150;

/**
 * Full-screen cart route at `/cart`.
 *
 * Composes every primitive in `components/cart/` with the cart
 * state from `lib/cart-context.tsx`. Responsibilities:
 *
 *   1. Resolve the flat `{productId: qty}` map into `CartLine[]`
 *      with full Product objects — resolved by scanning every
 *      STORES menu section so the cart can contain items from
 *      multiple merchants in a future backend integration.
 *
 *   2. Compute subtotal + item count in a single memoized pass.
 *
 *   3. Own the transient UI state the children don't care about:
 *      coupon text input, coupon apply loading flag, delete
 *      confirmation target, clear-cart modal visibility.
 *
 *   4. Wire the confirm modals to the cart mutations so
 *      `CartItemCard` can always call `onDecrement` unconditionally
 *      and the screen decides whether to pop a confirmation when
 *      the quantity is about to drop to zero.
 */
export function CartScreen() {
  const { t } = useTranslation();
  const { cart, addToCart, removeFromCart, removeLine, clearCart } = useCart();
  const couponTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (couponTimer.current) clearTimeout(couponTimer.current); }, []);

  // ─── Product pool ──────────────────────────────────────────
  // Flatten every product from every menu section across every
  // merchant into a single lookup. Used to resolve cart ids into
  // real Product objects and to power the cross-selling scroller.
  const productPool: Record<string, Product> = useMemo(() => {
    const pool: Record<string, Product> = {};
    for (const store of STORES) {
      for (const section of store.menuSections ?? []) {
        for (const product of section.products) {
          pool[product.id] = product;
        }
      }
    }
    return pool;
  }, []);

  // ─── Derived cart lines + totals ──────────────────────────
  const lines: CartLine[] = useMemo(() => {
    const out: CartLine[] = [];
    for (const [productId, quantity] of Object.entries(cart)) {
      if (quantity <= 0) continue;
      const product = productPool[productId];
      if (!product) continue;
      out.push({ product, quantity });
    }
    return out;
  }, [cart, productPool]);

  const { totalPrice, itemCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const line of lines) {
      const unit = line.product.discountPrice ?? line.product.price;
      total += unit * line.quantity;
      count += line.quantity;
    }
    return { totalPrice: total, itemCount: count };
  }, [lines]);

  // ─── Cross-selling ────────────────────────────────────────
  const crossSellItems: Product[] = useMemo(() => {
    const inCart = new Set(Object.keys(cart));
    return Object.values(productPool)
      .filter((p) => !inCart.has(p.id))
      .slice(0, 6);
  }, [cart, productPool]);

  // ─── Transient UI state ───────────────────────────────────
  /** Product id targeted by the remove-confirmation modal. When
   *  non-null, the modal is visible and `onConfirm` removes this
   *  line entirely. */
  const [lineToRemove, setLineToRemove] = useState<string | null>(null);
  /** Clear-cart confirmation modal visibility. */
  const [showClearModal, setShowClearModal] = useState(false);

  // Coupon state — UI only, no real validation yet. Kept lifted
  // so the input field survives across the CartSummary's
  // collapse toggle.
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponInfo | null>(
    null
  );

  const handleCouponCodeChange = useCallback((code: string) => {
    setCouponCode(code);
    setCouponError('');
  }, []);

  const handleApplyCoupon = useCallback(
    (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) return;
      setCouponLoading(true);
      setCouponError('');
      setCouponSuccess('');
      // Fake validation with a short delay so the spinner is
      // visible. A future backend call replaces this setTimeout.
      if (couponTimer.current) clearTimeout(couponTimer.current);
      couponTimer.current = setTimeout(() => {
        if (trimmed === 'STAMPLY10' || trimmed === 'TEST') {
          setAppliedCoupon({
            code: trimmed,
            label: t('cart.coupon_label_10_percent'),
          });
          setCouponSuccess(t('cart.coupon_applied') as string);
          setCouponCode('');
        } else {
          setCouponError(t('cart.coupon_invalid') as string);
        }
        setCouponLoading(false);
      }, 600);
    },
    [t]
  );

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  }, []);

  // ─── Increment / decrement wiring ─────────────────────────
  const handleIncrement = useCallback(
    (productId: string) => {
      addToCart(productId);
    },
    [addToCart]
  );

  const handleDecrement = useCallback(
    (productId: string) => {
      const current = cart[productId] ?? 0;
      if (current <= 1) {
        // About to hit zero — show confirmation instead of
        // silently removing the line.
        setLineToRemove(productId);
        return;
      }
      removeFromCart(productId);
    },
    [cart, removeFromCart]
  );

  const confirmRemoveLine = useCallback(() => {
    if (lineToRemove) removeLine(lineToRemove);
    setLineToRemove(null);
  }, [lineToRemove, removeLine]);

  const confirmClearCart = useCallback(() => {
    clearCart();
    setShowClearModal(false);
    // Also clear any applied coupon — coupons don't survive an
    // empty cart.
    setAppliedCoupon(null);
  }, [clearCart]);

  const isEmpty = lines.length === 0;

  // Discount amount — simple 10 % off when the fake coupon is
  // applied. Replace with real coupon type handling later.
  const discountAmount = appliedCoupon ? totalPrice * 0.1 : 0;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenContainer>
        <CartHeader
          onBack={() => router.back()}
          onClearCart={isEmpty ? undefined : () => setShowClearModal(true)}
        />

        {isEmpty ? (
          <EmptyCart onPressBrowse={() => router.replace('/(tabs)/stores')} />
        ) : (
          <>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingTop: 12,
                paddingBottom: 120,
                gap: 12,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FreeDeliveryBanner
                totalPrice={totalPrice}
                threshold={FREE_DELIVERY_THRESHOLD}
              />

              <CartItemList
                lines={lines}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
              />

              {/* Cross-selling uses the exact same primitive from
                  the product detail screen — no duplication. */}
              <View className="mx-4">
                <ProductCrossSelling
                  items={crossSellItems}
                  onItemPress={(item) => router.push(`/product/${item.id}`)}
                  onAdd={(item) => addToCart(item.id)}
                />
              </View>

              <CartSummary
                totalPrice={totalPrice}
                itemCount={itemCount}
                appliedCoupon={appliedCoupon}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
                couponLoading={couponLoading}
                couponError={couponError}
                couponSuccess={couponSuccess}
                couponCode={couponCode}
                onCouponCodeChange={handleCouponCodeChange}
                discountAmount={discountAmount}
              />
            </ScrollView>

            <CartBottomBar
              onAddMore={() => router.back()}
              onCheckout={() => router.push('/checkout')}
            />
          </>
        )}
      </ScreenContainer>

      {/* Remove-line confirmation — opened when a CartItemCard
          tries to decrement its line to zero. */}
      <ConfirmModal
        visible={lineToRemove !== null}
        onClose={() => setLineToRemove(null)}
        onConfirm={confirmRemoveLine}
        title={t('cart.remove_item_title')}
        description={t('cart.remove_item_description')}
        confirmLabel={t('cart.yes')}
        cancelLabel={t('cart.no')}
        destructive
      />

      {/* Clear-cart confirmation — opened from the header trash
          button. */}
      <ConfirmModal
        visible={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={confirmClearCart}
        title={t('cart.clear_cart_title')}
        description={t('cart.clear_cart_description')}
        confirmLabel={t('cart.yes')}
        cancelLabel={t('cart.no')}
        destructive
      />
    </SafeAreaView>
  );
}
