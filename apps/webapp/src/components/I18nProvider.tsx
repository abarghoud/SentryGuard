'use client';

import { createInstance, i18n as I18n } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { getUserLanguage, hasToken } from '../lib/api';
import { DEFAULT_LOCALE, setLocaleCookie } from '../lib/i18n-config';

const localeLoaders: Record<string, () => Promise<Record<string, string>>> = {
  en: () => import('../locales/en/common.json').then((m) => m.default),
  fr: () => import('../locales/fr/common.json').then((m) => m.default),
};

export const i18n: I18n = createInstance();

async function loadTranslations(locale: string): Promise<Record<string, string>> {
  const loader = localeLoaders[locale] || localeLoaders[DEFAULT_LOCALE];
  return loader();
}

let initPromise: Promise<void> | null = null;

function initializeI18n(locale: string): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = loadTranslations(locale).then(async (translations) => {
    await i18n.use(initReactI18next).init({
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: 'common',
      resources: { [locale]: { common: translations } },
      react: { useSuspense: false },
    });
  });

  return initPromise;
}

export async function addLocaleIfNeeded(locale: string): Promise<void> {
  if (i18n.hasResourceBundle(locale, 'common')) {
    return;
  }

  const translations = await loadTranslations(locale);
  i18n.addResourceBundle(locale, 'common', translations);
}

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: string;
}

export default function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: I18nProviderProps) {
  const lastSyncedLocale = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (!i18n.isInitialized) {
      initializeI18n(initialLocale).then(() => setIsReady(true));
    }
  }, [initialLocale]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const syncLocale = async () => {
      if (lastSyncedLocale.current !== initialLocale) {
        await addLocaleIfNeeded(initialLocale);
        if (i18n.language !== initialLocale) {
          await i18n.changeLanguage(initialLocale);
        }
        lastSyncedLocale.current = initialLocale;
      }

      if (!hasToken()) {
        return;
      }

      try {
        const response = await getUserLanguage();

        if (response.language !== i18n.language) {
          await addLocaleIfNeeded(response.language);
          await i18n.changeLanguage(response.language);
          document.documentElement.lang = response.language;
          setLocaleCookie(response.language);
        }
      } catch {
        // Keep current language from server detection
      }
    };

    syncLocale();
  }, [initialLocale, isReady]);

  if (!isReady) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
