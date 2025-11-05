'use client';

import { createInstance, Resource } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { useEffect, useState } from 'react';

const resources: Resource = {
  en: {
    common: require('../locales/en/common.json'),
  },
  fr: {
    common: require('../locales/fr/common.json'),
  },
};

export const i18n = createInstance({
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
    i18n.init().then(() => {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'fr') {
        i18n.changeLanguage('fr');
        document.documentElement.lang = 'fr';
        setCurrentLng('fr');
      } else {
        document.documentElement.lang = 'en';
        setCurrentLng('en');
      }
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
