import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import da from '../locales/da.json';
import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';
import nl from '../locales/nl.json';
import no from '../locales/no.json';
import sv from '../locales/sv.json';

export const supportedLanguages = ['en', 'fr', 'de', 'nl', 'no', 'es', 'it', 'sv', 'da'] as const;
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
    de: { translation: de },
    nl: { translation: nl },
    no: { translation: no },
    es: { translation: es },
    it: { translation: it },
    sv: { translation: sv },
    da: { translation: da },
  },
});

export { i18n };
