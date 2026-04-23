import { useEffect, useRef, useCallback } from 'react';
import { Image, Animated, Easing } from 'react-native';

/* eslint-disable @typescript-eslint/no-require-imports */
const LOGO_SOURCE = require('../assets/logo-stamply.png');

/**
 * Animated Stamply logo.
 *
 * Animation: fade-in + scale-up → pulse → fade-out.
 * Uses RN built-in Animated (works identically on iOS + web).
 *
 * Timeline:
 *   0–600ms    Logo fades in (0→1) + scales (0.7→1)
 *   800ms      Pulse: scale 1→1.08→1
 *   1600ms     Fade out + slight scale up
 *   ~1900ms    onComplete
 */

const LOGO_ASPECT = 1387 / 470;

type Props = {
  onComplete?: () => void;
  triggerKey?: number;
  logoWidth?: number;
};

export function AnimatedLogo({
  onComplete,
  triggerKey = 0,
  logoWidth = 260,
}: Props) {
  const logoHeight = logoWidth / LOGO_ASPECT;

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  const fireComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    // Reset
    opacity.setValue(0);
    scale.setValue(0.7);

    Animated.sequence([
      // Phase 1: fade in + scale up
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),

      // Phase 2: hold briefly
      Animated.delay(300),

      // Phase 3: pulse
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.08,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),

      // Phase 4: hold after pulse
      Animated.delay(300),

      // Phase 5: fade out + scale up
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      fireComplete();
    });
  }, [triggerKey]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ scale }],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        source={LOGO_SOURCE}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
