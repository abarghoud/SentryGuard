'use client';

import { createInstance, Resource, i18n as I18n } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { useEffect, useState } from 'react';
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

export default function I18nProvider({ children }: I18nProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initializeI18n = async () => {
      if (!i18n.isInitialized) {
        await i18n
          .use(initReactI18next)
          .init({
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

      await i18n.changeLanguage(languageToUse);
      document.documentElement.lang = languageToUse;
      setIsLoaded(true);
    };

    initializeI18n();
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tesla-600"></div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
