export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'nl', 'no', 'es', 'it', 'sv', 'da'] as const;
export const DEFAULT_LOCALE = 'en';

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function setLocaleCookie(locale: string) {
  document.cookie = `locale=${locale};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}
