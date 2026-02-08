'use client';

import { createInstance, Resource, i18n as I18n } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { getUserLanguage, hasToken } from '../lib/api';

const resources: Resource = {
  en: {
    common: require('../locales/en/common.json'),
  },
  fr: {
    common: require('../locales/fr/common.json'),
  },
};

export const i18n: I18n = createInstance();
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

function setLocaleCookie(lang: string) {
  document.cookie = `locale=${lang};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: string;
}

export default function I18nProvider({
  children,
  initialLocale = 'en',
}: I18nProviderProps) {
  const lastSyncedLocale = useRef<string | null>(null);

  if (lastSyncedLocale.current !== initialLocale) {
    if (i18n.language !== initialLocale) {
      i18n.changeLanguage(initialLocale);
    }
    lastSyncedLocale.current = initialLocale;
  }

  useEffect(() => {
    const syncAuthenticatedLanguage = async () => {
      if (!hasToken()) {
        return;
      }

      try {
        const response = await getUserLanguage();

        if (response.language !== i18n.language) {
          await i18n.changeLanguage(response.language);
          document.documentElement.lang = response.language;
          setLocaleCookie(response.language);
        }
      } catch {
        // Keep current language from server detection
      }
    };

    syncAuthenticatedLanguage();
  }, [initialLocale]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
