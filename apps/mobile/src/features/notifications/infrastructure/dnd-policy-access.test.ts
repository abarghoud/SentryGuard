jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

const mockRequireOptionalNativeModule = jest.fn();
jest.mock('expo', () => ({
  requireOptionalNativeModule: (name: string) => mockRequireOptionalNativeModule(name),
}));

import { Platform } from 'react-native';

import { DndPolicyAccess } from './dnd-policy-access';

describe('The DndPolicyAccess class', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  describe('The isNotificationPolicyAccessGranted() method', () => {
    describe('When the native module reports granted access', () => {
      it('should return true', async () => {
        mockRequireOptionalNativeModule.mockReturnValue({
          isNotificationPolicyAccessGranted: jest.fn().mockResolvedValue(true),
        });

        await expect(new DndPolicyAccess().isNotificationPolicyAccessGranted()).resolves.toBe(true);
      });
    });

    describe('When the native module is missing', () => {
      it('should return false instead of throwing', async () => {
        mockRequireOptionalNativeModule.mockReturnValue(null);

        await expect(new DndPolicyAccess().isNotificationPolicyAccessGranted()).resolves.toBe(false);
      });
    });

    describe('When the platform is not Android', () => {
      it('should return true without using the native module', async () => {
        Platform.OS = 'ios';
        mockRequireOptionalNativeModule.mockReturnValue(null);

        await expect(new DndPolicyAccess().isNotificationPolicyAccessGranted()).resolves.toBe(true);
      });
    });
  });

  describe('The ensureCriticalNotificationChannel() method', () => {
    describe('When the native module recreates the channel', () => {
      it('should forward the channel id and name', async () => {
        const ensureChannel = jest.fn().mockResolvedValue(true);
        mockRequireOptionalNativeModule.mockReturnValue({ ensureCriticalNotificationChannel: ensureChannel });

        await new DndPolicyAccess().ensureCriticalNotificationChannel('channel-id', 'Channel name');

        expect(ensureChannel).toHaveBeenCalledWith('channel-id', 'Channel name');
      });
    });

    describe('When the native module is missing', () => {
      it('should return false instead of throwing', async () => {
        mockRequireOptionalNativeModule.mockReturnValue(null);

        await expect(new DndPolicyAccess().ensureCriticalNotificationChannel('channel-id', 'Channel name')).resolves.toBe(false);
      });
    });
  });
});
