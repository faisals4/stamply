import '../global.css';
import { useEffect, useState } from 'react';
import { I18nManager, Platform, View, ActivityIndicator, NativeModules } from 'react-native';
import * as Updates from 'expo-updates';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { queryClient } from '../lib/queryClient';
import { initI18n } from '../lib/i18n';

/**
 * Root layout.
 *
 * Responsibilities before the first screen mounts:
 *   1. Load the stored locale and initialise i18next.
 *   2. Align the layout direction with the locale. On native this
 *      means flipping I18nManager + reloading the JS bundle. On web
 *      it means setting `<html dir="rtl|ltr">`, which browsers flip
 *      live without a reload.
 *   3. Render a splash while that's happening.
 *
 * Auth gating is handled by the index screen (`app/index.tsx`), which
 * reads storage synchronously and redirects to (auth)/login or
 * (tabs)/cards.
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const locale = await initI18n();
      const wantRTL = locale === 'ar';

      if (Platform.OS === 'web') {
        // Web: set document dir for CSS/browser layout.
        // Do NOT call I18nManager.forceRTL() on web — RN Web auto-flips
        // flexDirection:'row' when I18nManager.isRTL is true, which
        // double-flips with the manual 'row-reverse' in useLayoutRTL().
        if (typeof document !== 'undefined') {
          document.documentElement.dir = wantRTL ? 'rtl' : 'ltr';
          document.documentElement.lang = locale;
        }
      } else {
        // Native: I18nManager auto-flips flexDirection and textAlign.
        const needsFlip = I18nManager.isRTL !== wantRTL;
        if (needsFlip) {
          I18nManager.allowRTL(wantRTL);
          I18nManager.forceRTL(wantRTL);
        }

        // Native: forceRTL requires a JS bundle reload to take effect.
        if (needsFlip) {
          try {
            await Updates.reloadAsync();
            return;
          } catch {
            try {
              NativeModules.DevSettings?.reload?.();
              return;
            } catch {
              /* no reload available — saved locale applies on next restart */
            }
          }
        }
      }

      setReady(true);

      // Fire-and-forget: request notification permission, grab the
      // FCM token, POST it to /api/app/devices, and bind the
      // foreground / background / cold-start listeners. Safe to call
      // here because it's a no-op on web and guards internally if
      // the user hasn't logged in yet (re-runs after successful
      // login from the auth flow).
      initPushNotifications();
    })();
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#eb592e" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <CheckoutProvider>
            <MerchantAuthProvider>
              <SafeAreaProvider>
                <StatusBar style="auto" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#ffffff' },
                  }}
                />
              </SafeAreaProvider>
            </MerchantAuthProvider>
          </CheckoutProvider>
        </CartProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
