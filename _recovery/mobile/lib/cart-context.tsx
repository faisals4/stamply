import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Shape of the cart context — a flat `{ productId: quantity }`
 * map plus a small mutation API.
 *
 * Intentionally simple for the mock-data phase: no addon
 * selections, no per-merchant buckets, no persistence. Swap the
 * `useState` backing in `CartProvider` for AsyncStorage or a real
 * store when the backend cart API lands.
 */
export type CartMap = Record<string, number>;

type CartContextValue = {
  /** Current cart contents. Iterate via `Object.entries(cart)`. */
  cart: CartMap;
  /** Increment the quantity for `productId` by one. Creates the
   *  entry if it doesn't exist. */
  addToCart: (productId: string) => void;
  /** Decrement the quantity by one. Removes the entry entirely
   *  when called on a product with quantity 1. */
  removeFromCart: (productId: string) => void;
  /** Remove the entry for `productId` entirely, regardless of its
   *  current quantity. Used by the cart screen's trash confirmation. */
  removeLine: (productId: string) => void;
  /** Empty the cart in one call. Used by the cart screen's "clear
   *  cart" confirmation. */
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Wraps the entire app so any route (store detail, product detail,
 * cart screen) can read and mutate the same cart without passing
 * props through the router.
 *
 * Lives in `lib/` instead of `components/` because it's a cross-
 * cutting piece of state with no UI of its own.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartMap>({});

  const addToCart = useCallback((productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const current = prev[productId] ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  }, []);

  const removeLine = useCallback((productId: string) => {
    setCart((prev) => {
      if (!(productId in prev)) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({});
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({ cart, addToCart, removeFromCart, removeLine, clearCart }),
    [cart, addToCart, removeFromCart, removeLine, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Pulls the cart map + mutation helpers. Throws if called outside
 * a `CartProvider` — this is intentional so missing providers are
 * caught at the earliest possible point rather than silently
 * returning an empty cart.
 */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside a CartProvider');
  }
  return ctx;
}
