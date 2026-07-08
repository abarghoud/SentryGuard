jest.mock('expo-linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  sendIntent: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'android' },
  Share: { share: jest.fn(() => Promise.resolve()) },
}));
jest.mock('../../core/api', () => ({
  virtualKeyStore: { resolveDomain: jest.fn(() => '') },
}));
jest.mock('../../core/logging', () => ({
  appLogger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
  buildLogsExportFileName: jest.fn(() => 'logs.txt'),
  writeLogsExportFile: jest.fn(() => Promise.resolve('/tmp/logs.txt')),
}));
jest.mock('../../features/notifications/di', () => ({
  dndPolicyAccess: {
    isNotificationPolicyAccessGranted: jest.fn(() => Promise.resolve(false)),
  },
  pushNotificationService: {
    configure: jest.fn(() => Promise.resolve()),
    getCachedExpoPushToken: jest.fn(() => Promise.resolve(null)),
    requestExpoPushToken: jest.fn(() => Promise.resolve(null)),
  },
  registerPushTokenUseCase: {
    execute: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

import { resolveAvailablePushToken } from './settings.helpers';

describe('The resolveAvailablePushToken() function', () => {
  describe('When the current push token is already resolved', () => {
    it('should return the current push token', async () => {
      await expect(resolveAvailablePushToken('fresh-token', { push_enabled: false })).resolves.toBe('fresh-token');
    });
  });

  describe('When push is disabled before the current token is resolved', () => {
    it('should return the cached push token', async () => {
      await expect(resolveAvailablePushToken(null, { push_enabled: false }, async () => 'cached-token')).resolves.toBe(
        'cached-token'
      );
    });
  });

  describe('When push is enabled before the current token is resolved', () => {
    it('should not return the cached push token', async () => {
      await expect(
        resolveAvailablePushToken(null, { push_enabled: true }, async () => 'cached-token')
      ).resolves.toBeUndefined();
    });
  });
});
