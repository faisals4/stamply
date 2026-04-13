import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Branch, CarInfo } from '../components/checkout/branch-data';

/**
 * One saved delivery address. In the real backend this will come
 * back from the customer profile API; for now we seed a handful
 * of hardcoded entries in `components/checkout/mock-data.ts`.
 */
export type CheckoutAddress = {
  id: string;
  /** Short label — "البيت", "المكتب". */
  name: string;
  /** Full street address, rendered as the second line. */
  address: string;
  /** Optional city / neighborhood for sorting. */
  city?: string;
};

/** Delivery-time selection. `asap` fires the order immediately,
 *  `scheduled` pins it to a day + time slot string. */
export type CheckoutTimeSelection =
  | { mode: 'asap' }
  | { mode: 'scheduled'; day: string; slot: string };

export type CheckoutPaymentMethod = 'cash' | 'card' | 'apple_pay';

export type CheckoutOrderType = 'delivery' | 'pickup' | 'curbside';

type CheckoutContextValue = {
  /** Current order type — drives which blocks appear in checkout
   *  and which tab is active in the BranchSelectionModal. */
  orderType: CheckoutOrderType;
  setOrderType: (next: CheckoutOrderType) => void;

  /** Selected delivery address (delivery orders only). */
  address: CheckoutAddress | null;
  setAddress: (next: CheckoutAddress | null) => void;

  /** Selected pickup / curbside branch. */
  selectedBranch: Branch | null;
  setSelectedBranch: (next: Branch | null) => void;

  /** Selected car for curbside orders. */
  selectedCar: CarInfo | null;
  setSelectedCar: (next: CarInfo | null) => void;

  /** Estimated arrival time in minutes (curbside only). */
  arrivalTime: string | null;
  setArrivalTime: (next: string | null) => void;

  /** Dine-in vs takeaway (pickup only). */
  packageType: 'dine-in' | 'takeaway' | null;
  setPackageType: (next: 'dine-in' | 'takeaway' | null) => void;

  time: CheckoutTimeSelection;
  setTime: (next: CheckoutTimeSelection) => void;

  paymentMethod: CheckoutPaymentMethod | null;
  setPaymentMethod: (next: CheckoutPaymentMethod | null) => void;

  /** Reset every choice back to its default. */
  resetCheckout: () => void;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

/**
 * Wraps the whole app (nested inside `CartProvider` in
 * `app/_layout.tsx`) so the checkout screen can persist its
 * selections across navigation — if the user drops into `/cart`
 * and comes back, their address/time/payment are still picked.
 */
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [orderType, setOrderTypeState] = useState<CheckoutOrderType>('delivery');
  const [address, setAddressState] = useState<CheckoutAddress | null>(null);
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null);
  const [selectedCar, setSelectedCarState] = useState<CarInfo | null>(null);
  const [arrivalTime, setArrivalTimeState] = useState<string | null>(null);
  const [packageType, setPackageTypeState] = useState<'dine-in' | 'takeaway' | null>(null);
  const [time, setTimeState] = useState<CheckoutTimeSelection>({ mode: 'asap' });
  const [paymentMethod, setPaymentMethodState] =
    useState<CheckoutPaymentMethod | null>(null);

  const setOrderType = useCallback(
    (next: CheckoutOrderType) => setOrderTypeState(next),
    []
  );
  const setAddress = useCallback(
    (next: CheckoutAddress | null) => setAddressState(next),
    []
  );
  const setSelectedBranch = useCallback(
    (next: Branch | null) => setSelectedBranchState(next),
    []
  );
  const setSelectedCar = useCallback(
    (next: CarInfo | null) => setSelectedCarState(next),
    []
  );
  const setArrivalTime = useCallback(
    (next: string | null) => setArrivalTimeState(next),
    []
  );
  const setPackageType = useCallback(
    (next: 'dine-in' | 'takeaway' | null) => setPackageTypeState(next),
    []
  );
  const setTime = useCallback(
    (next: CheckoutTimeSelection) => setTimeState(next),
    []
  );
  const setPaymentMethod = useCallback(
    (next: CheckoutPaymentMethod | null) => setPaymentMethodState(next),
    []
  );

  const resetCheckout = useCallback(() => {
    setOrderTypeState('delivery');
    setAddressState(null);
    setSelectedBranchState(null);
    setSelectedCarState(null);
    setArrivalTimeState(null);
    setPackageTypeState(null);
    setTimeState({ mode: 'asap' });
    setPaymentMethodState(null);
  }, []);

  const value = useMemo<CheckoutContextValue>(
    () => ({
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
    }),
    [
      orderType, address, selectedBranch, selectedCar, arrivalTime, packageType, time, paymentMethod,
      setOrderType, setAddress, setSelectedBranch, setSelectedCar, setArrivalTime, setPackageType, setTime, setPaymentMethod, resetCheckout,
    ]
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

/**
 * Pulls the current checkout selections + their setters. Throws
 * when used outside a `CheckoutProvider` — same pattern as
 * `useCart`.
 */
export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) {
    throw new Error('useCheckout must be used inside a CheckoutProvider');
  }
  return ctx;
}
