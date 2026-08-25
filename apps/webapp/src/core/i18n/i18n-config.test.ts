import { DEFAULT_LOCALE, SUPPORTED_LOCALES, detectSupportedLocale } from './i18n-config';

describe('The i18n configuration', () => {
  describe('When listing supported locales', () => {
    it('should expose 9 locales including English as default', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(9);
      expect(SUPPORTED_LOCALES[0]).toBe(DEFAULT_LOCALE);
    });
  });

  describe('The detectSupportedLocale() function', () => {
    describe('When the header contains a supported locale tag', () => {
      it('should return the primary language subtag', () => {
        expect(detectSupportedLocale('fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr');
        expect(detectSupportedLocale('de-DE')).toBe('de');
        expect(detectSupportedLocale('sv-SE')).toBe('sv');
      });
    });

    describe('When the header contains Norwegian Bokmål or Nynorsk tags', () => {
      it('should map them to the "no" locale', () => {
        expect(detectSupportedLocale('nb-NO')).toBe('no');
        expect(detectSupportedLocale('nb')).toBe('no');
        expect(detectSupportedLocale('nn-NO')).toBe('no');
        expect(detectSupportedLocale('nb-NO,nb;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('no');
      });
    });

    describe('When the header contains no supported locale', () => {
      it('should return undefined', () => {
        expect(detectSupportedLocale('ja-JP,ja;q=0.9')).toBeUndefined();
        expect(detectSupportedLocale('')).toBeUndefined();
      });
    });
  });
});
