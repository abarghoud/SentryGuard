jest.mock('@react-navigation/native', () => ({
  DarkTheme: { colors: { background: '#000000' }, dark: true },
  DefaultTheme: { colors: { background: '#ffffff' }, dark: false },
}));
jest.mock('react-native', () => ({
  Appearance: { setColorScheme: jest.fn() },
  Platform: { OS: 'ios' },
  useColorScheme: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

import { createNavigationTheme } from './navigation-theme';
import type { ThemeColors } from '../theme';

const fakeColors = {
  label: '#111111',
  separator: '#222222',
  secondarySystemGroupedBackground: '#333333',
  systemBlue: '#444444',
  systemGroupedBackground: '#555555',
  systemRed: '#666666',
} as ThemeColors;

describe('The createNavigationTheme() function', () => {
  describe('When the resolved theme is dark', () => {
    it('should extend the navigation dark theme', () => {
      expect(createNavigationTheme(fakeColors, true).dark).toBe(true);
    });
  });

  describe('When the resolved theme is light', () => {
    it('should extend the navigation default theme', () => {
      expect(createNavigationTheme(fakeColors, false).dark).toBe(false);
    });
  });

  describe('When building the palette', () => {
    it('should map the app colors onto the navigation theme', () => {
      expect(createNavigationTheme(fakeColors, true).colors).toStrictEqual({
        background: '#555555',
        border: '#222222',
        card: '#333333',
        notification: '#666666',
        primary: '#444444',
        text: '#111111',
      });
    });
  });
});
