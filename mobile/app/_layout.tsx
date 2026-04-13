import '../global.css';
import { useEffect, useState } from 'react';
import { I18nManager, Platform, View, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { queryClient } from '../lib/queryClient';
import { initI18n } from '../lib/i18n';
import { colors } from '../lib/colors';
import { CartProvider } from '../lib/cart-context';
import { CheckoutProvider } from '../lib/checkout-context';
import { MerchantAuthProvider } from '../business/lib/merchant-auth';

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
        // Web: flip the document's dir attribute. No reload needed.
        if (typeof document !== 'undefined') {
          document.documentElement.dir = wantRTL ? 'rtl' : 'ltr';
          document.documentElement.lang = locale;
        }
      } else if (I18nManager.isRTL !== wantRTL) {
        // Native: force RN's layout direction. Requires a JS reload.
        I18nManager.allowRTL(wantRTL);
        I18nManager.forceRTL(wantRTL);
        try {
          await Updates.reloadAsync();
        } catch {
          /* reload unavailable — continue */
        }
      }

      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      </View>
    );
  }

  return (
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
  );
}
