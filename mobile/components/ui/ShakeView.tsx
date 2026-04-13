import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

type Props = {
  /** When true AND shakeToken changes, the children shake. */
  shake: boolean;
  /** Counter bumped by the parent each time it wants to trigger
   *  a shake. Even if `shake` stays true between two presses,
   *  bumping the token re-triggers the animation. */
  shakeToken: number;
  children: React.ReactNode;
};

/**
 * Shared horizontal shake wrapper. Wraps its children in an
 * `Animated.View` that does a 5-step translateX back-and-forth
 * whenever `shake === true` AND `shakeToken` increments.
 *
 * Used in:
 *   - `Addons.tsx` (ShakableGroup around each addon card)
 *   - `CheckoutScreen.tsx` (around location / preparation / payment blocks)
 *
 * Accepts a forwarded ref so the parent can call
 * `scrollIntoView` on the underlying DOM node.
 */
export const ShakeView = React.forwardRef<any, Props>(
  function ShakeView({ shake, shakeToken, children }, ref) {
    const tx = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (!shake || shakeToken === 0) return;
      tx.stopAnimation();
      tx.setValue(0);
      Animated.sequence([
        Animated.timing(tx, { toValue: -7, duration: 55, useNativeDriver: false }),
        Animated.timing(tx, { toValue: 7, duration: 55, useNativeDriver: false }),
        Animated.timing(tx, { toValue: -5, duration: 55, useNativeDriver: false }),
        Animated.timing(tx, { toValue: 5, duration: 55, useNativeDriver: false }),
        Animated.timing(tx, { toValue: 0, duration: 55, useNativeDriver: false }),
      ]).start();
    }, [shakeToken, shake, tx]);

    return (
      <Animated.View ref={ref} style={{ transform: [{ translateX: tx }] }}>
        {children}
      </Animated.View>
    );
  }
);
