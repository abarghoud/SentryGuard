'use client';

import { createInstance, Resource, i18n as I18n } from 'i18next';
import { I18nextProvider } from 'react-i18next';
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
});

interface I18nProviderProps {
  children: React.ReactNode;
}

export default function I18nProvider({ children }: I18nProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentLng, setCurrentLng] = useState('en');

  useEffect(() => {
    i18n.init().then(async () => {
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

      i18n.changeLanguage(languageToUse);
      document.documentElement.lang = languageToUse;
      setCurrentLng(languageToUse);
      setIsLoaded(true);
    });

    const handleLanguageChange = (lng: string) => {
      setCurrentLng(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  if (!isLoaded) {
    return <>{children}</>; // or a loading spinner
  }

  return (
    <I18nextProvider i18n={i18n}>
      <div key={currentLng}>{children}</div>
    </I18nextProvider>
  );
}
