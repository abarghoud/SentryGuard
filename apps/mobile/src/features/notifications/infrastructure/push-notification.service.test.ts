jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'project-1' } } } },
}));
jest.mock('expo-device', () => ({
  isDevice: true,
}));
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../../core/i18n', () => ({
  i18n: { t: (key: string) => key },
}));
jest.mock('../../../core/theme', () => ({
  lightColors: { systemGreen: '#34c759' },
}));

import { mock } from 'jest-mock-extended';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DndPolicyAccessRequirements } from './dnd-policy-access';
import { PushNotificationService, PushTokenRequestResult, PushTokenRequestStatus } from './push-notification.service';

describe('The PushNotificationService class', () => {
  const fakeToken = 'ExponentPushToken[fake]';
  let service: PushNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    service = new PushNotificationService(mock<DndPolicyAccessRequirements>());
  });

  describe('The requestExpoPushToken() method', () => {
    describe('When the permission is already granted', () => {
      let result: PushTokenRequestResult;

      beforeEach(async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ canAskAgain: true, granted: true });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: fakeToken });

        result = await service.requestExpoPushToken();
      });

      it('should return the granted status', () => {
        expect(result.status).toBe(PushTokenRequestStatus.Granted);
      });

      it('should return the expo push token', () => {
        expect(result.token).toBe(fakeToken);
      });

      it('should not prompt for the permission again', () => {
        expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      });
    });

    describe('When the user grants the permission from the prompt', () => {
      let result: PushTokenRequestResult;

      beforeEach(async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ canAskAgain: true, granted: false });
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ canAskAgain: true, granted: true });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: fakeToken });

        result = await service.requestExpoPushToken();
      });

      it('should return the granted status', () => {
        expect(result.status).toBe(PushTokenRequestStatus.Granted);
      });

      it('should return the expo push token', () => {
        expect(result.token).toBe(fakeToken);
      });
    });

    describe('When the user denies the permission but can be asked again', () => {
      let result: PushTokenRequestResult;

      beforeEach(async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ canAskAgain: true, granted: false });
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ canAskAgain: true, granted: false });

        result = await service.requestExpoPushToken();
      });

      it('should return the denied status', () => {
        expect(result.status).toBe(PushTokenRequestStatus.Denied);
      });

      it('should not return a token', () => {
        expect(result.token).toBeNull();
      });
    });

    describe('When the permission is permanently denied', () => {
      let result: PushTokenRequestResult;

      beforeEach(async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ canAskAgain: false, granted: false });
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ canAskAgain: false, granted: false });

        result = await service.requestExpoPushToken();
      });

      it('should return the blocked status', () => {
        expect(result.status).toBe(PushTokenRequestStatus.Blocked);
      });

      it('should not fetch a push token', () => {
        expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
      });
    });

    describe('When the platform is web', () => {
      let result: PushTokenRequestResult;

      beforeEach(async () => {
        Platform.OS = 'web';

        result = await service.requestExpoPushToken();
      });

      it('should return the unsupported status', () => {
        expect(result.status).toBe(PushTokenRequestStatus.Unsupported);
      });

      it('should not read the permission state', () => {
        expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
      });
    });
  });
});
