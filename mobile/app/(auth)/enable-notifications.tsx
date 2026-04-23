import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import { AuthScreen } from '../../components/auth/AuthScreen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../lib/colors';
import { requestPermission, registerPushToken } from '../../lib/push';

/**
 * Post-login pre-prompt for notification permission.
 *
 * Why a custom screen before the system dialog?
 *   iOS only lets us call requestPermission() once per install — if
 *   the user denies, we can't re-prompt without sending them to
 *   Settings. Showing this primer first lets us:
 *     - Explain the value (offers, rewards, real-time updates).
 *     - Increase the chance the user taps Allow on the OS dialog
 *       that follows.
 *     - Give them a graceful "Not now" path that doesn't burn the
 *       one-shot OS prompt.
 *
 * Flow:
 *   1. verify.tsx checks getPermissionStatus() after setAuth().
 *   2. If 'undetermined' → router.replace('/(auth)/enable-notifications').
 *   3. User taps "Enable Now" → requestPermission() (fires OS dialog)
 *      → registerPushToken() → home.
 *      User taps "Not now" → straight to home; we won't ask again
 *      automatically (could re-surface from settings later).
 */
export default function EnableNotificationsScreen() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const goHome = () => router.replace('/(tabs)/cards');

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        // Fire-and-forget — the user shouldn't wait on a network call
        // before reaching the home screen.
        registerPushToken().catch(() => { /* noop */ });
      }
    } finally {
      // Whether granted or denied, we proceed to the app — the OS
      // dialog already gave the user a clear yes/no choice.
      goHome();
    }
  };

  return (
    <AuthScreen>
      <View className="flex-1 items-center justify-center px-2">
        {/* Bell icon in a soft brand-tinted circle — large and centered
            so the value prop reads as the focal point. */}
        <View
          className="rounded-full items-center justify-center mb-8"
          style={{
            width: 120,
            height: 120,
            backgroundColor: `${colors.brand.DEFAULT}1A`, // 10% alpha
          }}
        >
          <Bell size={56} color={colors.brand.DEFAULT} strokeWidth={1.8} />
        </View>

        <Text
          className="text-center font-bold text-ink-primary"
          style={{ fontSize: 24, lineHeight: 32, marginBottom: 12 }}
        >
          {t('enable_notifications.title')}
        </Text>

        <Text
          className="text-center text-ink-secondary"
          style={{ fontSize: 15, lineHeight: 22, marginBottom: 40, paddingHorizontal: 12 }}
        >
          {t('enable_notifications.subtitle')}
        </Text>

        <View style={{ width: '100%', gap: 12 }}>
          <PrimaryButton
            label={t('enable_notifications.enable')}
            onPress={enable}
            loading={busy}
          />

          <Pressable
            onPress={goHome}
            disabled={busy}
            className="items-center justify-center"
            style={{ height: 44 }}
          >
            <Text
              className="text-ink-secondary"
              style={{ fontSize: 15, fontWeight: '500' }}
            >
              {t('enable_notifications.skip')}
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthScreen>
  );
}
