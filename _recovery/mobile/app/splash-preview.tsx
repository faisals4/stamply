import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Image, Animated, Easing } from 'react-native';
import { Stack } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';

/* eslint-disable @typescript-eslint/no-require-imports */
const LOGO_SOURCE = require('../assets/logo-stamply.png');

const LOGO_WIDTH = 260;
const LOGO_ASPECT = 1387 / 470;
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_ASPECT;

/**
 * /splash-preview — standalone page to preview the animated Stamply
 * logo. This version does NOT auto-fade — the logo stays visible so
 * you can inspect it. Press "Replay" to re-run the entrance animation.
 *
 * Once approved, the real splash in _layout.tsx uses the same
 * AnimatedLogo component WITH auto-fade.
 */
export default function SplashPreviewScreen() {
  const [key, setKey] = useState(0);

  const replay = () => setKey((k) => k + 1);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Logo with entrance animation — no fade-out in preview mode */}
        <PreviewLogo key={key} />

        {/* Replay button */}
        <Pressable
          onPress={replay}
          style={{
            position: 'absolute',
            bottom: 80,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#F3F4F6',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 100,
          }}
        >
          <RotateCcw color="#6B7280" size={16} strokeWidth={2} />
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            إعادة التشغيل
          </Text>
        </Pressable>
      </View>
    </>
  );
}

/**
 * Preview variant — logo fades in + scales up + pulses, then STAYS
 * visible (no fade-out). Remounts on each replay via `key` prop.
 */
function PreviewLogo() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    opacity.setValue(0);
    scale.setValue(0.7);

    Animated.sequence([
      // Fade in + scale up
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
      // Hold
      Animated.delay(300),
      // Pulse
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
      // Stay visible — no fade-out in preview
    ]).start();
  }, []);

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
        style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
