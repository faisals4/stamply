import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  I18nManager,
  Platform,
  ActivityIndicator,
} from 'react-native';
// `Alert` is still used for the language change restart prompt on
// native; keep the import.
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { LogOut, Globe, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { clearAuth } from '../../lib/auth';
import { unregisterPushToken } from '../../lib/push';
import { setStoredLocale, getStoredLocale, AppLocale } from '../../lib/i18n';
import { useIsRTL } from '../../lib/rtl';
import { useDrillChevron } from '../../lib/useDrillChevron';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { useMerchantAuth } from '../../business/lib/merchant-auth';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PageHeader } from '../../components/PageHeader';
import { surfaces } from '../../lib/surfaces';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Settings screen — profile summary, edit profile entry, language
 * toggle, logout. The profile card shows a verified badge when the
 * customer has confirmed their phone via OTP; the edit sheet writes
 * directly to the central `customer_profiles` row and locks each
 * field the customer fills so merchants can't override it.
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentLocale, setCurrentLocale] = useState<AppLocale>('ar');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const isRTL = useIsRTL();
  const DrillIcon = useDrillChevron();
  const { isLoggedIn, user: merchantUser } = useMerchantAuth();

  useEffect(() => {
    getStoredLocale().then(setCurrentLocale);
  }, []);

  const { data: me, isLoading } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: async () => (await api.me()).data,
  });

  const applyLocale = async (next: AppLocale) => {
    await setStoredLocale(next);
    const wantRTL = next === 'ar';

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return;
    }

    // Native: flip I18nManager and request a JS bundle reload.
    if (I18nManager.isRTL !== wantRTL) {
      I18nManager.allowRTL(wantRTL);
      I18nManager.forceRTL(wantRTL);
    }
    try {
      await Updates.reloadAsync();
    } catch {
      // reload unavailable (Expo Go sometimes) — user must relaunch manually
      setCurrentLocale(next);
    }
  };

  const toggleLanguage = () => {
    const next: AppLocale = currentLocale === 'ar' ? 'en' : 'ar';

    // Web flips instantly without a reload — skip the confirmation prompt.
    if (Platform.OS === 'web') {
      applyLocale(next);
      return;
    }

    Alert.alert(
      t('settings.language'),
      t('settings.restart_notice'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        { text: t('settings.save'), onPress: () => applyLocale(next) },
      ],
    );
  };

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      // Fire-and-forget: ignore server-side errors because the
      // local cleanup must happen regardless.
      try {
        await api.logout();
      } catch {
        /* ignore */
      }
      // Remove the FCM token from the backend + delete it locally
      // so the next account that logs in on this device gets a
      // fresh token.
      try {
        await unregisterPushToken();
      } catch {
        /* ignore */
      }
      await clearAuth();
      queryClient.clear();
      setLogoutSheetOpen(false);
      router.replace('/(auth)/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const fullName = [me?.first_name, me?.last_name].filter(Boolean).join(' ') || me?.phone || '—';
  const version = (Constants.expoConfig?.version as string) ?? '0.1.0';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScreenContainer>
        <PageHeader title={t('settings.title')} />

        <ScrollView className="flex-1">
        {/* Profile card */}
        <View className={`mx-4 mt-4 ${surfaces.card} p-4`}>
          {isLoading ? (
            <ActivityIndicator color="#eb592e" />
          ) : (
            <>
              <Text className="text-lg font-bold text-gray-900">{fullName}</Text>
              <Text className="mt-1 text-sm text-gray-500">{me?.phone}</Text>
              {me?.tenants_count ? (
                <Text className="mt-2 text-xs text-gray-400">
                  {me.tenants_count} {t('cards.title')}
                </Text>
              ) : null}
            </>
          )}
        </View>

        {/* For Business */}
        <Pressable
          onPress={() => router.push('/for-business' as any)}
          className={`mx-4 mt-4 flex-row items-center justify-between ${surfaces.card} p-4`}
        >
          <View className="flex-row items-center">
            <Store color={colors.brand.DEFAULT} size={20} strokeWidth={0.9} />
            <Text className="ms-3 text-base text-gray-900">
              {t('settings.for_business')}
            </Text>
          </View>
          <DrillIcon color={colors.ink.tertiary} size={18} strokeWidth={0.9} />
        </Pressable>

        {/* Language */}
        <Pressable
          onPress={toggleLanguage}
          className={`mx-4 mt-4 flex-row items-center justify-between ${surfaces.card} p-4`}
        >
          <View className="flex-row items-center">
            <Globe color="#6B7280" size={20} strokeWidth={0.9} />
            <Text className="ms-3 text-base text-gray-900">{t('settings.language')}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="me-2 text-sm text-gray-500">
              {currentLocale === 'ar' ? t('settings.ar') : t('settings.en')}
            </Text>
            <DrillIcon color="#9CA3AF" size={18} strokeWidth={0.9} />
          </View>
        </Pressable>

        {/* Logout */}
        <Pressable
          onPress={() => setLogoutSheetOpen(true)}
          disabled={loggingOut}
          className={`mx-4 mt-4 flex-row items-center ${surfaces.card} p-4`}
        >
          <LogOut color="#EF4444" size={20} strokeWidth={0.9} />
          <Text className="ms-3 text-base font-semibold text-red-500">
            {t('settings.logout')}
          </Text>
        </Pressable>

        <Text className="mt-6 text-center text-xs text-gray-400">
          {t('settings.version', { version })}
        </Text>
        </ScrollView>
      </ScreenContainer>

      <ConfirmSheet
        visible={logoutSheetOpen}
        onClose={() => (loggingOut ? null : setLogoutSheetOpen(false))}
        onConfirm={performLogout}
        title={t('settings.logout_confirm_title')}
        message={t('settings.logout_confirm_message')}
        confirmLabel={t('settings.logout')}
        cancelLabel={t('settings.cancel')}
        icon={LogOut}
        destructive
        loading={loggingOut}
      />

      {me ? (
        <ProfileEditSheet
          visible={editSheetOpen}
          onClose={() => setEditSheetOpen(false)}
          me={me}
        />
      ) : null}
    </SafeAreaView>
  );
}
