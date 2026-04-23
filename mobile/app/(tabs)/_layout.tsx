import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { CreditCard, Store, Tag, Settings as SettingsIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { isAuthenticated } from '../../lib/auth';

/**
 * Tabs layout — also acts as the auth gate for every screen inside
 * the (tabs) group. A visitor who deep-links to `/app/cards` (or any
 * other tab) without a stored token gets redirected to `/app/login`
 * before the tab content ever mounts. This catches both:
 *   - bookmarked URLs after the customer logged out
 *   - shared deep links from a friend who's already signed in
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const [auth, setAuth] = useState<'pending' | 'in' | 'out'>('pending');

  useEffect(() => {
    isAuthenticated().then((ok) => setAuth(ok ? 'in' : 'out'));
  }, []);

  if (auth === 'pending') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.page }}>
        <ActivityIndicator size="large" color="#eb592e" />
      </View>
    );
  }

  if (auth === 'out') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#eb592e',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: [
          {
            backgroundColor: Platform.OS === 'web'
              ? 'rgba(255, 255, 255, 0.85)'
              : colors.page,
            borderTopColor: '#E5E7EB',
            paddingTop: 6,
            height: Platform.OS === 'ios' ? 85 : 60,
            paddingBottom: Platform.OS === 'ios' ? 20 : 0,
          },
          Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              } as any)
            : null,
        ],
      }}
    >
      <Tabs.Screen
        name="cards"
        options={{
          title: t('cards.title'),
          // `strokeWidth: 0.9` — thinner-than-default Lucide line
          // weight, matches the rest of the iconography in Settings.
          tabBarIcon: ({ color, size }) => (
            <CreditCard color={color} size={size} strokeWidth={0.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: t('stores.title'),
          tabBarIcon: ({ color, size }) => (
            <Store color={color} size={size} strokeWidth={0.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: t('offers.title'),
          tabBarIcon: ({ color, size }) => (
            <Tag color={color} size={size} strokeWidth={0.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon color={color} size={size} strokeWidth={0.9} />
          ),
        }}
      />
    </Tabs>
  );
}
