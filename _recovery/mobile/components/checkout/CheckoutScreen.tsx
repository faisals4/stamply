import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';

import { useCart } from '../../lib/cart-context';
import { useCheckout } from '../../lib/checkout-context';
import { ScreenContainer } from '../ScreenContainer';
import { STORES } from '../stores/data';
import type { Product } from '../stores/types';
import type { CartLine } from '../cart/CartItemList';

import { CheckoutHeader } from './CheckoutHeader';
import { ProductsCollapsibleBlock } from './ProductsCollapsibleBlock';
import { DeliveryBlock } from './DeliveryBlock';
import { BranchInfoBlock } from './BranchInfoBlock';
import { ShakeView } from '../ui/ShakeView';
import { CarInfoBlock } from './CarInfoBlock';
import { ArrivalTimeBlock } from './ArrivalTimeBlock';
import { PreparationPreference } from './PreparationPreference';
import { BranchSelectionModal, type BranchSelection } from './BranchSelectionModal';
import { CarSelectionModal } from './CarSelectionModal';
import { TimeSelectionBlock } from './TimeSelectionBlock';
import { TimePickerModal } from './TimePickerModal';
import { OrderSummaryBlock } from './OrderSummaryBlock';
import { PaymentMethodBlock } from './PaymentMethodBlock';
import { CheckoutBottomBar } from './CheckoutBottomBar';
import { OrderSuccessModal } from './OrderSuccessModal';
import { DELIVERY_FEE } from './mock-data';

/**
 * Full-screen `/checkout` route.
 *
 * Now supports 3 order types via the `BranchSelectionModal`:
 *   - **delivery** — address picker + delivery fee
 *   - **pickup** — branch selector, no delivery fee
 *   - **curbside** — branch selector, no delivery fee
 *
 * The active order type is stored in `CheckoutContext.orderType`
 * and drives which blocks are visible + whether the delivery fee
 * is added to the total.
 */
export function CheckoutScreen() {
  const { cart, clearCart } = useCart();
  const {
    orderType,
    setOrderType,
    address,
    setAddress,
    selectedBranch,
    setSelectedBranch,
    selectedCar,
    setSelectedCar,
    arrivalTime,
    setArrivalTime,
    packageType,
    setPackageType,
    time,
    setTime,
    paymentMethod,
    setPaymentMethod,
    resetCheckout,
  } = useCheckout();

  // ─── Product pool + lines + totals ─────────────────────────
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

  const subtotal = useMemo(() => {
    let total = 0;
    for (const line of lines) {
      const unit = line.product.discountPrice ?? line.product.price;
      total += unit * line.quantity;
    }
    return total;
  }, [lines]);

  // Delivery fee only applies for delivery orders.
  const deliveryFee = orderType === 'delivery' ? DELIVERY_FEE : 0;
  const discount = 0;
  const total = subtotal + deliveryFee - discount;

  // ─── Transient UI state ───────────────────────────────────
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showCarModal, setShowCarModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Validation flags.
  const [locationInvalid, setLocationInvalid] = useState(false);
  const [preparationInvalid, setPreparationInvalid] = useState(false);
  const [paymentInvalid, setPaymentInvalid] = useState(false);

  // Refs for scroll-to-error + shake animation.
  const locationRef = useRef<any>(null);
  const preparationRef = useRef<any>(null);
  const paymentRef = useRef<any>(null);
  const [shakeToken, setShakeToken] = useState(0);

  /** Scroll to the first invalid block + trigger shake. Uses
   *  `scrollIntoView` (browser-native, RTL-aware) for reliable
   *  centering, then bumps shakeToken after a short delay so
   *  the block shakes AFTER the scroll settles. */
  const scrollToFirstError = useCallback(
    (refs: Array<React.RefObject<any>>, flags: boolean[]) => {
      for (let i = 0; i < refs.length; i++) {
        if (flags[i] && refs[i].current) {
          const node = refs[i].current;
          if (typeof node.scrollIntoView === 'function') {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setTimeout(() => setShakeToken((t) => t + 1), 400);
          return;
        }
      }
    },
    []
  );

  // ─── Handlers ──────────────────────────────────────────────

  const handleOpenLocationPicker = useCallback(() => {
    setShowBranchModal(true);
    setLocationInvalid(false);
  }, []);

  const handleBranchConfirm = useCallback(
    (selection: BranchSelection) => {
      setOrderType(selection.type);
      if (selection.type === 'delivery') {
        setAddress({
          id: selection.address.id,
          name: selection.address.label,
          address: selection.address.details,
        });
        setSelectedBranch(null);
        setSelectedCar(null);
      } else {
        setSelectedBranch(selection.branch);
        setAddress(null);
        // Auto-assign the first car for curbside if none selected yet.
        if (selection.type === 'curbside' && !selectedCar) {
          const { savedCars } = require('./branch-data');
          if (savedCars.length > 0) setSelectedCar(savedCars[0]);
        }
      }
      setLocationInvalid(false);
    },
    [setOrderType, setAddress, setSelectedBranch, setSelectedCar, selectedCar]
  );

  const handleSelectAsap = useCallback(() => {
    setTime({ mode: 'asap' });
  }, [setTime]);

  const handleOpenScheduler = useCallback(() => {
    setShowTimePicker(true);
  }, []);

  const handleConfirmScheduledTime = useCallback(
    (day: string, slot: string) => {
      // "الآن" / "Now" means ASAP — switch back to asap mode
      // instead of storing a scheduled entry with "Now" as the slot.
      if (slot === 'الآن' || slot === 'Now') {
        setTime({ mode: 'asap' });
      } else {
        setTime({ mode: 'scheduled', day, slot });
      }
    },
    [setTime]
  );

  const handlePaymentChange = useCallback(
    (next: Parameters<typeof setPaymentMethod>[0]) => {
      setPaymentMethod(next);
      setPaymentInvalid(false);
    },
    [setPaymentMethod]
  );

  const handleConfirmOrder = useCallback(() => {
    const locErr =
      (orderType === 'delivery' && !address) ||
      (orderType !== 'delivery' && !selectedBranch);
    const prepErr = orderType === 'pickup' && !packageType;
    const payErr = !paymentMethod;

    if (locErr) setLocationInvalid(true);
    if (prepErr) setPreparationInvalid(true);
    if (payErr) setPaymentInvalid(true);

    if (locErr || prepErr || payErr) {
      // Scroll to + shake the first invalid block (order matches
      // the visual top-to-bottom sequence on screen).
      scrollToFirstError(
        [locationRef, preparationRef, paymentRef],
        [locErr, prepErr, payErr]
      );
      return;
    }

    setConfirming(true);
    setTimeout(() => {
      const num = Math.floor(100000 + Math.random() * 900000).toString();
      setOrderNumber(num);
      setConfirming(false);
      setShowSuccess(true);
    }, 800);
  }, [orderType, address, selectedBranch, packageType, paymentMethod, scrollToFirstError]);

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
    clearCart();
    resetCheckout();
    router.replace('/(tabs)/stores');
  }, [clearCart, resetCheckout]);

  const isEmpty = lines.length === 0;

  // ─── Location display label ─────────────────────────────
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-page">
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenContainer>
        <CheckoutHeader onBack={() => router.back()} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 120,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ProductsCollapsibleBlock lines={lines} />

          {/* Order-type-specific location block — renders the right
              card depending on the order type set via the
              BranchSelectionModal. Matches checkout.tsx in orders4
              where DeliveryBlock and BranchInfoBlock are siblings
              inside a conditional chain. */}
          <ShakeView
            ref={locationRef}
            shake={locationInvalid}
            shakeToken={shakeToken}
          >
            {orderType === 'delivery' ? (
              <DeliveryBlock
                address={address}
                isInvalid={locationInvalid}
                onChange={handleOpenLocationPicker}
              />
            ) : (
              <BranchInfoBlock
                variant={orderType}
                branch={selectedBranch}
                isInvalid={locationInvalid}
                onSelectBranch={handleOpenLocationPicker}
                onChangeBranch={handleOpenLocationPicker}
              />
            )}
          </ShakeView>

          {/* Car info — curbside only. Shows the selected car or
              a default, with a "تغيير" button that opens the car
              selection modal. Matches orders4 checkout.tsx line 873. */}
          {/* Curbside: car info + estimated arrival time */}
          {orderType === 'curbside' && selectedCar ? (
            <View className="mx-4">
              <CarInfoBlock
                car={selectedCar}
                onChange={() => setShowCarModal(true)}
              />
            </View>
          ) : null}

          {orderType === 'curbside' ? (
            <ArrivalTimeBlock
              selectedTime={arrivalTime}
              onChange={setArrivalTime}
            />
          ) : null}

          {/* Pickup: preparation preference (dine-in / takeaway) */}
          {orderType === 'pickup' ? (
            <ShakeView
              ref={preparationRef}
              shake={preparationInvalid}
              shakeToken={shakeToken}
            >
              <PreparationPreference
                value={packageType}
                onChange={(type) => {
                  setPackageType(type);
                  setPreparationInvalid(false);
                }}
                isInvalid={preparationInvalid}
              />
            </ShakeView>
          ) : null}

          <TimeSelectionBlock
            time={time}
            onSelectAsap={handleSelectAsap}
            onOpenScheduler={handleOpenScheduler}
          />

          <OrderSummaryBlock
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            discount={discount}
            total={total}
          />

          <ShakeView
            ref={paymentRef}
            shake={paymentInvalid}
            shakeToken={shakeToken}
          >
            <PaymentMethodBlock
              value={paymentMethod}
              onChange={handlePaymentChange}
              isInvalid={paymentInvalid}
            />
          </ShakeView>
        </ScrollView>

        <CheckoutBottomBar
          total={total}
          loading={confirming}
          onConfirm={handleConfirmOrder}
        />
      </ScreenContainer>

      <BranchSelectionModal
        visible={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        initialTab={orderType}
        onConfirm={handleBranchConfirm}
      />

      <CarSelectionModal
        visible={showCarModal}
        onClose={() => setShowCarModal(false)}
        selectedCarId={selectedCar?.id}
        onSelect={(car) => setSelectedCar(car)}
      />

      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onConfirm={handleConfirmScheduledTime}
        initialDay={time.mode === 'scheduled' ? time.day : null}
        initialSlot={time.mode === 'scheduled' ? time.slot : null}
      />

      <OrderSuccessModal
        visible={showSuccess}
        orderNumber={orderNumber}
        onClose={handleSuccessClose}
      />

      {isEmpty && !showSuccess ? <EmptyGuard /> : null}
    </SafeAreaView>
  );
}

function EmptyGuard() {
  useEffect(() => {
    router.replace('/(tabs)/stores');
  }, []);
  return null;
}
