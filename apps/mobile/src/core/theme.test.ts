jest.mock('react-native', () => ({
  Appearance: { setColorScheme: jest.fn() },
  Platform: { OS: 'ios' },
  useColorScheme: jest.fn(),
}));
jest.mock('./theme-storage', () => ({
  getStoredThemeMode: jest.fn(() => Promise.resolve(null)),
  storeThemeMode: jest.fn(() => Promise.resolve()),
}));

import { resolveIsDark, ThemeMode } from './theme';

describe('The resolveIsDark() function', () => {
  describe('When the mode is Dark', () => {
    it('should be dark whatever the system scheme', () => {
      expect(resolveIsDark(ThemeMode.Dark, 'light')).toBe(true);
    });
  });

  describe('When the mode is Light', () => {
    it('should be light whatever the system scheme', () => {
      expect(resolveIsDark(ThemeMode.Light, 'dark')).toBe(false);
    });
  });

  describe('When the mode is System', () => {
    describe('When the system scheme is dark', () => {
      it('should be dark', () => {
        expect(resolveIsDark(ThemeMode.System, 'dark')).toBe(true);
      });
    });

    describe('When the system scheme is light', () => {
      it('should be light', () => {
        expect(resolveIsDark(ThemeMode.System, 'light')).toBe(false);
      });
    });

    describe('When the system scheme is unknown', () => {
      it('should fall back to light', () => {
        expect(resolveIsDark(ThemeMode.System, null)).toBe(false);
      });
    });
  });
});
