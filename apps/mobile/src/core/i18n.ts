import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import fr from '../locales/fr.json';

export const supportedLanguages = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

void i18n.use(initReactI18next).init({
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
  lng: 'fr',
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
});

export { i18n };
