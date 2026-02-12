export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
export const DEFAULT_LOCALE = 'en';

export function setLocaleCookie(locale: string) {
  document.cookie = `locale=${locale};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}
