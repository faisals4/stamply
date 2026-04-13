import { View, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '../../lib/colors';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { useMerchantDrawer } from '../components/MerchantSideDrawer';


/**
 * Embeds a web admin page inside the mobile app shell.
 *
 * On web (the primary platform): renders an <iframe> that loads the
 * requested `/admin/*` path. Before loading, it bridges authentication
 * by copying the merchant token (`stamply.merchant.token`) into the
 * key the web dashboard expects (`stamply.token`) — both live in the
 * same origin's localStorage so this is safe and instant.
 *
 * Accepts `url` (relative path like `/admin/reports`) and `title`
 * (displayed in the HeaderBar) via route query params.
 */
export function MerchantWebScreen() {
  const { url, title, activeKey } = useLocalSearchParams<{ url: string; title: string; activeKey?: string }>();
  const { menuButton, drawer } = useMerchantDrawer(activeKey);
  // No token bridging needed — the web admin reads
  // stamply.merchant.token directly when in embed mode
  // (sessionStorage stamply.embed=1), so the customer's
  // stamply.token is never touched.

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <HeaderBar
          title={title || ''}
          onBack={() => router.back()}
          endAction={menuButton}
        />

        {Platform.OS === 'web' ? (
          <View className="flex-1" style={{ backgroundColor: '#F9FAFB' }}>
            <iframe
              src={`${url || '/admin'}${(url || '').includes('?') ? '&' : '?'}embed=1`}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
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
