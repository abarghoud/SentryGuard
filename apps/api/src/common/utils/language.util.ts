export type SupportedLanguage =
  | 'en'
  | 'fr'
  | 'de'
  | 'nl'
  | 'no'
  | 'es'
  | 'it'
  | 'sv'
  | 'da';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'en',
  'fr',
  'de',
  'nl',
  'no',
  'es',
  'it',
  'sv',
  'da',
];

const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const TESLA_LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  nl: 'nl-NL',
  no: 'nb-NO',
  es: 'es-ES',
  it: 'it-IT',
  sv: 'sv-SE',
  da: 'da-DK',
};

export function extractPreferredLanguage(
  acceptLanguageHeader?: string
): SupportedLanguage {
  if (!acceptLanguageHeader) {
    return DEFAULT_LANGUAGE;
  }

  const languages = acceptLanguageHeader
    .split(',')
    .map((lang) => {
      const [code, qValue] = lang.trim().split(';');
      const quality = qValue ? parseFloat(qValue.split('=')[1]) : 1.0;
      return { code: code.split('-')[0].toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const lang of languages) {
    const match = SUPPORTED_LANGUAGES.find(
      (supported) => supported === lang.code
    );
    if (match) {
      return match;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function normalizeTeslaLocale(locale: SupportedLanguage): string {
  return TESLA_LOCALE_BY_LANGUAGE[locale] ?? TESLA_LOCALE_BY_LANGUAGE[DEFAULT_LANGUAGE];
}
