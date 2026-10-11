jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockGetLastNotificationResponse = jest.fn();
jest.mock('expo-notifications', () => ({
  getLastNotificationResponse: () => mockGetLastNotificationResponse(),
}));

import { Platform } from 'react-native';

import { getLastNotificationResponse } from './last-notification-response';

describe('The getLastNotificationResponse() function', () => {
  const fakeNotificationResponse = { actionIdentifier: 'OPEN_TESLA' };

  beforeEach(() => {
    mockGetLastNotificationResponse.mockReset();
    mockGetLastNotificationResponse.mockReturnValue(fakeNotificationResponse);
  });

  describe('When running on a native platform', () => {
    let result: unknown;

    beforeEach(() => {
      Platform.OS = 'ios';
      result = getLastNotificationResponse();
    });

    it('should return the last notification response', () => {
      expect(result).toBe(fakeNotificationResponse);
    });
  });

  describe('When running on the web', () => {
    let result: unknown;

    beforeEach(() => {
      Platform.OS = 'web';
      result = getLastNotificationResponse();
    });

    it('should return null', () => {
      expect(result).toBeNull();
    });

    it('should not call the native notifications module', () => {
      expect(mockGetLastNotificationResponse).not.toHaveBeenCalled();
    });
  });
});
