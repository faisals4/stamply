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
import { LogOut, Globe, BadgeCheck, ShoppingBag, Store, Heart } from 'lucide-react-native';
import { SettingsRow } from '../../components/SettingsRow';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { clearAuth } from '../../lib/auth';
import { setStoredLocale, getStoredLocale, AppLocale } from '../../lib/i18n';
import { useIsRTL } from '../../lib/rtl';
import { useDrillChevron } from '../../lib/useDrillChevron';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { useMerchantAuth } from '../../business/lib/merchant-auth';
import { ProfileEditSheet } from '../../components/ProfileEditSheet';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PageHeader } from '../../components/PageHeader';
import { Avatar } from '../../components/Avatar';
import { surfaces } from '../../lib/surfaces';
import { colors } from '../../lib/colors';
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
      // Web: flip <html dir> live — no reload needed.
      if (typeof document !== 'undefined') {
        document.documentElement.dir = wantRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = next;
      }
      setCurrentLocale(next);
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
    <SafeAreaView className="flex-1 bg-page">
      <ScreenContainer>
        <PageHeader title={t('settings.title')} />

        <ScrollView className="flex-1">
        {/* Profile card — avatar (Gravatar by email, initials fallback)
            on the inline-start, name + verified badge + phone + cards
            count stacked on the inline-end. Mirrors the merchant
            dashboard avatar pattern (web/src/components/ui/avatar-img.tsx)
            so both products share one visual identity. */}
        {/* Profile card — tapping opens the edit profile sheet.
            The drill chevron at inline-end signals interactivity. */}
        {isLoading ? (
          <View className={`mx-4 mt-4 items-center justify-center ${surfaces.card} p-4`}>
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : !me ? (
          /* Not logged in — show login prompt */
          <Pressable
            onPress={() => router.push('/(auth)/login' as any)}
            className={`mx-4 mt-4 flex-row items-center justify-between ${surfaces.card} p-4`}
          >
            <View className="flex-1" style={{ gap: 4 }}>
              <Text className="text-base font-bold text-gray-900">
                {t('settings.login_prompt_title')}
              </Text>
              <Text className="text-xs text-gray-400">
                {t('settings.login_prompt_subtitle')}
              </Text>
            </View>
            <DrillIcon color={colors.ink.tertiary} size={18} strokeWidth={0.9} />
          </Pressable>
        ) : (
          /* Logged in — show profile */
          <Pressable
            onPress={() => setEditSheetOpen(true)}
            className={`mx-4 mt-4 flex-row items-center justify-between ${surfaces.card} p-4`}
          >
            <View className="flex-1 flex-row items-center" style={{ gap: 12 }}>
              <Avatar name={fullName} email={me?.email ?? null} size={56} />
              <View className="flex-1">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Text className="text-lg font-bold text-gray-900">{fullName}</Text>
                  {me?.phone_verified_at ? (
                    <BadgeCheck
                      color={colors.brand.DEFAULT}
                      size={18}
                      strokeWidth={2}
                    />
                  ) : null}
                </View>
                <Text
                  className="mt-1 text-start text-sm text-gray-500"
                  style={{ writingDirection: isRTL ? 'rtl' : 'ltr' }}
                >
                  {me?.phone ? `\u2066${me.phone}\u2069` : ''}
                </Text>
              </View>
            </View>
            <DrillIcon color={colors.ink.tertiary} size={18} strokeWidth={0.9} />
          </Pressable>
        )}

        <SettingsRow
          icon={ShoppingBag}
          label={t('settings.orders')}
          onPress={() => router.push('/orders' as any)}
        />
        <SettingsRow
          icon={Heart}
          label={t('settings.favorites')}
          onPress={() => router.push('/favorites' as any)}
        />
        <SettingsRow
          icon={Store}
          label={t('settings.for_business')}
          subtitle={
            isLoggedIn
              ? merchantUser?.tenant_name
                ? `${t('settings.manage_store')} (${merchantUser.tenant_name})`
                : t('settings.manage_store')
              : t('settings.for_business_subtitle')
          }
          subtitleColor={isLoggedIn ? colors.brand.DEFAULT : undefined}
          onPress={() => router.push('/for-business' as any)}
        />
        <SettingsRow
          icon={Globe}
          label={t('settings.language')}
          value={currentLocale === 'ar' ? t('settings.ar') : t('settings.en')}
          onPress={toggleLanguage}
        />
        <SettingsRow
          icon={LogOut}
          label={t('settings.logout')}
          destructive
          hideChevron
          onPress={() => setLogoutSheetOpen(true)}
          disabled={loggingOut}
        />

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
