import { useEffect } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { colors } from '../lib/colors';
import { ScreenContainer } from '../components/ScreenContainer';
import { HeaderBar } from '../components/ui/HeaderBar';
import { useMerchantDrawer } from '../business/components/MerchantSideDrawer';

const TOKEN_KEY = 'stamply.merchant.token';
const USER_KEY = 'stamply.merchant.user';
const WEB_TOKEN_KEY = 'stamply.token';
const WEB_USER_KEY = 'stamply.user';

export default function MerchantDashboardRoute() {
  const { t } = useTranslation();
  const { menuButton, drawer } = useMerchantDrawer('dashboard');

  // Bridge auth
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
    const merchantToken = localStorage.getItem(TOKEN_KEY);
    const merchantUser = localStorage.getItem(USER_KEY);
    if (merchantToken) localStorage.setItem(WEB_TOKEN_KEY, merchantToken);
    if (merchantUser) localStorage.setItem(WEB_USER_KEY, merchantUser);
  }, []);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <HeaderBar
          title={t('merchant.dashboard_title')}
          onBack={() => router.replace('/(tabs)/settings' as any)}
          backIcon={<X color={colors.navIcon} size={20} strokeWidth={2} />}
          endAction={menuButton}
        />
        {Platform.OS === 'web' ? (
          <View className="flex-1" style={{ backgroundColor: '#F9FAFB' }}>
            {/* @ts-ignore */}
            <iframe
              src="/admin?embed=1"
              style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
            />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
          </View>
        )}
      </ScreenContainer>
      {drawer}
    </SafeAreaView>
  );
}
