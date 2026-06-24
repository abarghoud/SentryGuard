import {
  extractPreferredLanguage,
  normalizeTeslaLocale,
} from './language.util';

describe('Language Utilities', () => {
  describe('extractPreferredLanguage', () => {
    it('should return "fr" for French header', () => {
      expect(extractPreferredLanguage('fr-FR')).toBe('fr');
      expect(extractPreferredLanguage('fr')).toBe('fr');
      expect(extractPreferredLanguage('fr-CA')).toBe('fr');
    });

    it('should return "en" for English header', () => {
      expect(extractPreferredLanguage('en-US')).toBe('en');
      expect(extractPreferredLanguage('en')).toBe('en');
      expect(extractPreferredLanguage('en-GB')).toBe('en');
    });

    it('should return the matching language for newly supported locales', () => {
      expect(extractPreferredLanguage('de-DE')).toBe('de');
      expect(extractPreferredLanguage('nl-NL')).toBe('nl');
      expect(extractPreferredLanguage('no')).toBe('no');
      expect(extractPreferredLanguage('es-ES')).toBe('es');
      expect(extractPreferredLanguage('it-IT')).toBe('it');
      expect(extractPreferredLanguage('sv-SE')).toBe('sv');
      expect(extractPreferredLanguage('da-DK')).toBe('da');
    });

    it('should return "en" for unsupported languages', () => {
      expect(extractPreferredLanguage('ja-JP')).toBe('en');
      expect(extractPreferredLanguage('pt-BR')).toBe('en');
      expect(extractPreferredLanguage('zh-CN')).toBe('en');
    });

    it('should return "en" for undefined header', () => {
      expect(extractPreferredLanguage(undefined)).toBe('en');
      expect(extractPreferredLanguage('')).toBe('en');
    });

    it('should handle complex Accept-Language headers', () => {
      expect(
        extractPreferredLanguage('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7')
      ).toBe('fr');
      expect(
        extractPreferredLanguage('en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7')
      ).toBe('en');
    });

    it('should respect quality values', () => {
      expect(extractPreferredLanguage('en;q=0.5,fr;q=0.9')).toBe('fr');
      expect(extractPreferredLanguage('fr;q=0.3,en;q=0.8')).toBe('en');
    });
  });

  describe('normalizeTeslaLocale', () => {
    it('should convert "en" to "en-US"', () => {
      expect(normalizeTeslaLocale('en')).toBe('en-US');
    });

    it('should convert "fr" to "fr-FR"', () => {
      expect(normalizeTeslaLocale('fr')).toBe('fr-FR');
    });

    it('should map newly supported languages to their Tesla locale', () => {
      expect(normalizeTeslaLocale('de')).toBe('de-DE');
      expect(normalizeTeslaLocale('nl')).toBe('nl-NL');
      expect(normalizeTeslaLocale('no')).toBe('nb-NO');
      expect(normalizeTeslaLocale('es')).toBe('es-ES');
      expect(normalizeTeslaLocale('it')).toBe('it-IT');
      expect(normalizeTeslaLocale('sv')).toBe('sv-SE');
      expect(normalizeTeslaLocale('da')).toBe('da-DK');
    });
  });
});

