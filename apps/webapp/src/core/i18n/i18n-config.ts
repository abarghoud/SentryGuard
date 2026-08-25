export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'nl', 'no', 'es', 'it', 'sv', 'da'] as const;
export const DEFAULT_LOCALE = 'en';

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_ALIASES: Record<string, SupportedLocale> = {
  nb: 'no',
  nn: 'no',
};

export function detectSupportedLocale(acceptLanguage: string): SupportedLocale | undefined {
  const requestedCodes = acceptLanguage
    .toLowerCase()
    .split(',')
    .map((part) => part.split(';')[0].trim().split('-')[0])
    .filter((code) => code.length > 0);

  for (const requestedCode of requestedCodes) {
    const normalized = LOCALE_ALIASES[requestedCode] ?? requestedCode;
    const match = SUPPORTED_LOCALES.find((locale) => locale === normalized);

    if (match) {
      return match;
    }
  }

  return undefined;
}

export function setLocaleCookie(locale: string) {
  document.cookie = `locale=${locale};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}
