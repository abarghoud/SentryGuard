'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { i18n, addLocaleIfNeeded } from './I18nProvider';
import { hasToken } from '../core/api/token-manager';
import { useUserQuery } from '../features/user/di';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, setLocaleCookie } from '../core/i18n/i18n-config';

const FLAGS = {
  en: (
    <svg viewBox="0 0 60 30" className="w-5 h-3.5 rounded-sm shadow-sm border border-gray-200 dark:border-gray-600">
      <path d="M0 0h60v30H0z" fill="#012169" />
      <path d="m0 0 60 30M60 0 0 30" stroke="#fff" strokeWidth="6" />
      <path d="m0 0 60 30M60 0 0 30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  ),
  fr: (
    <svg viewBox="0 0 3 2" className="w-5 h-3.5 rounded-sm shadow-sm border border-gray-200 dark:border-gray-600">
      <rect width="1" height="2" fill="#002395" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#ED2939" />
    </svg>
  )
};

const LANGUAGES = [
  { code: 'en', label: 'English', flag: FLAGS.en },
  { code: 'fr', label: 'Français', flag: FLAGS.fr },
];

export default function LanguageSwitcher({
  className = '',
  variant = 'default',
}: {
  className?: string;
  variant?: 'default' | 'minimal';
}) {
  const [currentLang, setCurrentLang] = useState(i18n.language || DEFAULT_LOCALE);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { updateLanguageMutation } = useUserQuery();

  useEffect(() => {
    setCurrentLang(i18n.language);
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const changeLanguage = async (lng: string) => {
    setCurrentLang(lng);
    await addLocaleIfNeeded(lng);
    await i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    setLocaleCookie(lng);
    setIsOpen(false);

    if (hasToken()) {
      try {
        await updateLanguageMutation.mutateAsync(lng as 'en' | 'fr');
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

  const currentLangNormalized = currentLang?.split('-')[0].toLowerCase() || DEFAULT_LOCALE;
  const currentLanguage = LANGUAGES.find(l => l.code === currentLangNormalized) || LANGUAGES[0];

  const variantClasses =
    variant === 'minimal'
      ? 'p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
      : 'px-4 py-2 min-h-[40px] bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`flex items-center justify-center gap-2 w-full rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm ${variantClasses}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={currentLanguage.label}
      >
        <div className="flex items-center justify-center">
          {currentLanguage.flag}
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl z-[100] overflow-hidden origin-top-right ring-1 ring-black ring-opacity-5 transition-all duration-200">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Select Language
            </div>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 ${
                  currentLangNormalized === lang.code
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex-shrink-0">
                  {lang.flag}
                </div>
                <span className="flex-grow text-left">{lang.label}</span>
                {currentLangNormalized === lang.code && (
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
