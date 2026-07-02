jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

import * as SecureStore from 'expo-secure-store';

import { getStoredAlertsSeenAt, storeAlertsSeenAt } from './alerts-seen-storage';

describe('The getStoredAlertsSeenAt() function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When a valid date is stored', () => {
    it('should return the stored date', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('2026-06-12T10:00:00.000Z');

      await expect(getStoredAlertsSeenAt()).resolves.toBe('2026-06-12T10:00:00.000Z');
    });
  });

  describe('When the stored value is not a date', () => {
    it('should return null', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('not-a-date');

      await expect(getStoredAlertsSeenAt()).resolves.toBeNull();
    });
  });

  describe('When nothing is stored', () => {
    it('should return null', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await expect(getStoredAlertsSeenAt()).resolves.toBeNull();
    });
  });
});

describe('The storeAlertsSeenAt() function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When storing a seen date', () => {
    it('should persist the date in the secure store', async () => {
      await storeAlertsSeenAt('2026-06-12T10:00:00.000Z');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sentryguard.alertsSeenAt', '2026-06-12T10:00:00.000Z');
    });
  });
});
