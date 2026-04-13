import { useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { isAuthenticated } from '../../lib/auth';
import { colors } from '../../lib/colors';

/**
 * Auth layout — also acts as a "reverse" auth gate. If a customer
 * who's already logged in opens `/app/login` directly, redirect
 * them straight into the cards tab instead of making them re-enter
 * a phone number they already verified.
 *
 * Uses useFocusEffect so it re-checks every time the screen is
 * focused (e.g. browser back button from cards → login).
 */
export default function AuthLayout() {
  const [auth, setAuth] = useState<'pending' | 'in' | 'out'>('pending');

  useFocusEffect(
    useCallback(() => {
      isAuthenticated().then((ok) => setAuth(ok ? 'in' : 'out'));
    }, []),
  );

  if (auth === 'pending') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      </View>
    );
  }

  if (auth === 'in') {
    return <Redirect href="/(tabs)/cards" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
