'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { i18n, addLocaleIfNeeded } from './I18nProvider';
import { updateUserLanguage, hasToken } from '../lib/api';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, setLocaleCookie } from '../lib/i18n-config';

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState(i18n.language || DEFAULT_LOCALE);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setCurrentLang(i18n.language);
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const changeLanguage = async (lng: string) => {
    setCurrentLang(lng);
    await addLocaleIfNeeded(lng);
    await i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    setLocaleCookie(lng);

    if (hasToken()) {
      try {
        await updateUserLanguage(lng as 'en' | 'fr');
      } catch (error) {
        console.warn('Failed to update language on server:', error);
      }
    }

    const currentLocale = SUPPORTED_LOCALES.find(
      (locale) =>
        pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
    );

    if (currentLocale) {
      const newPath = pathname.replace(`/${currentLocale}`, `/${lng}`);
      router.push(newPath);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="flex gap-2 w-full sm:w-auto">
      <button
        onClick={() => changeLanguage('en')}
        className={`flex-1 sm:flex-none px-3 py-1 rounded text-sm font-medium transition-colors ${
          currentLang === 'en'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('fr')}
        className={`flex-1 sm:flex-none px-3 py-1 rounded text-sm font-medium transition-colors ${
          currentLang === 'fr'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        FR
      </button>
    </div>
  );
}
