export function extractPreferredLanguage(
  acceptLanguageHeader?: string
): 'en' | 'fr' {
  if (!acceptLanguageHeader) {
    return 'en';
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
    if (lang.code === 'fr' || lang.code === 'en') {
      return lang.code as 'en' | 'fr';
    }
  }

  return 'en';
}

export function normalizeTeslaLocale(locale: 'en' | 'fr'): string {
  return locale === 'fr' ? 'fr-FR' : 'en-US';
}

