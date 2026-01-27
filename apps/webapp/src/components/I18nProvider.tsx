'use client';

import { createInstance, Resource, i18n as I18n } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { useEffect } from 'react';
import { getUserLanguage, hasToken } from '../lib/api';

const resources: Resource = {
  en: {
    common: require('../locales/en/common.json'),
  },
  fr: {
    common: require('../locales/fr/common.json'),
  },
};

export const i18n: I18n = createInstance({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  resources,
  initImmediate: false,
});

interface I18nProviderProps {
  children: React.ReactNode;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    resources,
    initImmediate: false,
    react: {
      useSuspense: false,
    },
  });
}

export default function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    const updateLanguage = async () => {
      let languageToUse = 'en';

      if (hasToken()) {
        try {
          const response = await getUserLanguage();
          languageToUse = response.language;
        } catch {
          const browserLang = navigator.language.split('-')[0];
          languageToUse = browserLang === 'fr' ? 'fr' : 'en';
        }
      } else {
        const browserLang = navigator.language.split('-')[0];
        languageToUse = browserLang === 'fr' ? 'fr' : 'en';
      }

      if (i18n.language !== languageToUse) {
        await i18n.changeLanguage(languageToUse);
        document.documentElement.lang = languageToUse;
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        updateLanguage();
      });
    } else {
      setTimeout(() => {
        updateLanguage();
      }, 100);
    }
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
