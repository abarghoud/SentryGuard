import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import fr from '../locales/fr.json';

export const supportedLanguages = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export function resolveSupportedLanguage(languageCode: string | null | undefined): SupportedLanguage {
  return supportedLanguages.find((language) => language === languageCode) ?? 'en';
}

export function resolveDeviceLanguage(): SupportedLanguage {
  return resolveSupportedLanguage(getLocales()[0]?.languageCode);
}

void i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  lng: resolveDeviceLanguage(),
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
});

export { i18n };
