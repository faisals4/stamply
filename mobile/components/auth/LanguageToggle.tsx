import { useEffect, useState } from 'react';
import { Pressable, Text, I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { useTranslation } from 'react-i18next';
import { setStoredLocale, getStoredLocale, AppLocale } from '../../lib/i18n';

/**
 * Compact language toggle pill — shows the OTHER language as the
 * tap target, so the customer always sees what they'd switch TO.
 *
 * Used in the top corner of unauthenticated screens (login, verify)
 * so a customer who lands in the wrong language can flip without
 * having to dig into Settings first.
 *
 * Web: instant flip via `document.documentElement.dir`.
 * Native: `I18nManager.forceRTL` + `Updates.reloadAsync` because the
 * RTL layout flag only takes effect after a JS bundle reload.
 */
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState<AppLocale>('ar');

  useEffect(() => {
    getStoredLocale().then(setCurrent);
  }, []);

  // Sync with whatever i18next currently has so the label updates
  // immediately after a switch instead of staying stale.
  useEffect(() => {
    const lang = (i18n.language || 'ar').startsWith('ar') ? 'ar' : 'en';
    setCurrent(lang);
  }, [i18n.language]);

  const toggle = async () => {
    const next: AppLocale = current === 'ar' ? 'en' : 'ar';
    await setStoredLocale(next);
    setCurrent(next);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        // Reload the page so RN-Web recalculates all layout directions.
        // Setting document.dir alone doesn't re-layout existing flexbox.
        window.location.reload();
      }
      return;
    }

    const wantRTL = next === 'ar';
    if (I18nManager.isRTL !== wantRTL) {
      I18nManager.allowRTL(wantRTL);
      I18nManager.forceRTL(wantRTL);
    }
    try {
      await Updates.reloadAsync();
    } catch {
      // Expo Go etc. — the language preference is saved, the layout
      // direction will catch up after a manual relaunch.
    }
  };

  // Show the OTHER language as the tap target so the user always
  // reads "what they'd switch to" rather than "what they're on".
  const label = current === 'ar' ? 'English' : 'العربية';

  return (
    <Pressable
      onPress={toggle}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#F0F0F0',
      }}
      accessibilityLabel="Toggle language"
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#464041' }}>
        {label}
      </Text>
    </Pressable>
  );
}
