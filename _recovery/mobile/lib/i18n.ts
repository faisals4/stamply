import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import ar from '../locales/ar.json';
import en from '../locales/en.json';
import { getItem, setItem } from './storage';

const LOCALE_KEY = 'stamply.locale';

export type AppLocale = 'ar' | 'en';

export async function getStoredLocale(): Promise<AppLocale> {
  const stored = await getItem(LOCALE_KEY);
  if (stored === 'ar' || stored === 'en') return stored;

  // Default to Arabic unless device is clearly English.
  const device = Localization.getLocales()[0]?.languageCode;
  return device === 'en' ? 'en' : 'ar';
}

export async function setStoredLocale(locale: AppLocale) {
  await setItem(LOCALE_KEY, locale);
  await i18n.changeLanguage(locale);
}

export async function initI18n(): Promise<AppLocale> {
  const locale = await getStoredLocale();

  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    lng: locale,
    fallbackLng: 'en',
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
  });

  return locale;
}

export default i18n;
