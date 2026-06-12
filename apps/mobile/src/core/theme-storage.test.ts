jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

import * as SecureStore from 'expo-secure-store';

import { getStoredThemeMode } from './theme-storage';
import { ThemeMode } from './theme';

describe('The getStoredThemeMode() function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When the stored value is system', () => {
    it('should return the system mode', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('system');

      await expect(getStoredThemeMode()).resolves.toBe(ThemeMode.System);
    });
  });

  describe('When the stored value is dark', () => {
    it('should return the dark mode', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('dark');

      await expect(getStoredThemeMode()).resolves.toBe(ThemeMode.Dark);
    });
  });

  describe('When the stored value is invalid', () => {
    it('should return null', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('purple');

      await expect(getStoredThemeMode()).resolves.toBeNull();
    });
  });

  describe('When nothing is stored', () => {
    it('should return null', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await expect(getStoredThemeMode()).resolves.toBeNull();
    });
  });
});
