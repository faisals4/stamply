import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { isAuthenticated } from '../lib/auth';

/**
 * Boot splash + auth gate. Reads the token once on mount and
 * redirects to either the tabs (if logged in) or the login screen.
 */
export default function Index() {
  useEffect(() => {
    (async () => {
      const loggedIn = await isAuthenticated();
      router.replace(loggedIn ? '/(tabs)/cards' : '/(auth)/login');
    })();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#003BC0" />
    </View>
  );
}
