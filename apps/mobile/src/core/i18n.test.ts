const mockGetLocales = jest.fn(() => [] as { languageCode: string }[]);
jest.mock('expo-localization', () => ({
  getLocales: () => mockGetLocales(),
}));
jest.mock('i18next', () => ({
  __esModule: true,
  default: { use: jest.fn(() => ({ init: jest.fn() })) },
}));
jest.mock('react-i18next', () => ({
  initReactI18next: {},
}));

import { resolveDeviceLanguage, resolveSupportedLanguage } from './i18n';

describe('The resolveSupportedLanguage() function', () => {
  describe('When the language code is supported', () => {
    it('should return French for fr', () => {
      expect(resolveSupportedLanguage('fr')).toBe('fr');
    });

    it('should return English for en', () => {
      expect(resolveSupportedLanguage('en')).toBe('en');
    });
  });

  describe('When the language code is not supported', () => {
    it('should fall back to English', () => {
      expect(resolveSupportedLanguage('de')).toBe('en');
    });
  });

  describe('When the language code is missing', () => {
    it('should fall back to English for null', () => {
      expect(resolveSupportedLanguage(null)).toBe('en');
    });

    it('should fall back to English for undefined', () => {
      expect(resolveSupportedLanguage(undefined)).toBe('en');
    });
  });
});

describe('The resolveDeviceLanguage() function', () => {
  describe('When the device locale is French', () => {
    it('should return French', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'fr' }]);

      expect(resolveDeviceLanguage()).toBe('fr');
    });
  });

  describe('When the device locale is unsupported', () => {
    it('should fall back to English', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'es' }]);

      expect(resolveDeviceLanguage()).toBe('en');
    });
  });

  describe('When the device reports no locale', () => {
    it('should fall back to English', () => {
      mockGetLocales.mockReturnValue([]);

      expect(resolveDeviceLanguage()).toBe('en');
    });
  });
});
