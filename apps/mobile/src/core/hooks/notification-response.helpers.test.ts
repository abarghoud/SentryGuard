jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  clearLastNotificationResponse: jest.fn(),
}));

jest.mock('../api', () => ({
  sessionValidator: {
    ensureSessionValid: jest.fn(),
  },
  tokenStore: {
    hasToken: jest.fn(),
    loadFromStorage: jest.fn(),
  },
}));

jest.mock('../tesla-app-link', () => ({
  openTeslaApp: jest.fn(),
}));

jest.mock('../../features/notifications/di', () => ({
  muteNotificationsUseCase: {
    execute: jest.fn(),
  },
}));

jest.mock('../logging', () => ({
  appLogger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { QueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { muteNotificationsUseCase } from '../../features/notifications/di';
import { sessionValidator, tokenStore } from '../api';
import { appLogger } from '../logging';
import { openTeslaApp } from '../tesla-app-link';
import { handleAlertNotificationResponse } from './notification-response.helpers';

describe('The handleAlertNotificationResponse() function', () => {
  let mockQueryClient: QueryClient;

  const buildNotificationResponse = (
    actionIdentifier: string,
    data?: Record<string, unknown>
  ): Notifications.NotificationResponse =>
    ({
      actionIdentifier,
      notification: {
        request: {
          content: { data: data ?? {} },
        },
      },
    }) as unknown as Notifications.NotificationResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryClient = {
      invalidateQueries: jest.fn(),
    } as unknown as QueryClient;
    (tokenStore.hasToken as jest.Mock).mockReturnValue(true);
    (muteNotificationsUseCase.execute as jest.Mock).mockResolvedValue({ muted_until: '2026-09-13T22:00:00.000Z' });
    (sessionValidator.ensureSessionValid as jest.Mock).mockResolvedValue(undefined);
  });

  describe('When actionIdentifier is MUTE_1H', () => {
    beforeEach(async () => {
      const response = buildNotificationResponse('MUTE_1H');
      await handleAlertNotificationResponse(response, mockQueryClient);
    });

    it('should clear last notification response', () => {
      expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
    });

    it('should execute muteNotificationsUseCase with 60 minutes', () => {
      expect(muteNotificationsUseCase.execute).toHaveBeenCalledWith(60);
    });

    it('should invalidate notification-preferences queries', () => {
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['notification-preferences'] });
    });

    it('should log info message', () => {
      expect(appLogger.info).toHaveBeenCalledWith('notifications', 'Muted notifications for 60m via quick action');
    });
  });

  describe('When actionIdentifier is MUTE_4H', () => {
    it('should execute muteNotificationsUseCase with 240 minutes', async () => {
      const response = buildNotificationResponse('MUTE_4H');
      await handleAlertNotificationResponse(response, mockQueryClient);

      expect(muteNotificationsUseCase.execute).toHaveBeenCalledWith(240);
    });
  });

  describe('When actionIdentifier is MUTE_24H', () => {
    it('should execute muteNotificationsUseCase with 1440 minutes', async () => {
      const response = buildNotificationResponse('MUTE_24H');
      await handleAlertNotificationResponse(response, mockQueryClient);

      expect(muteNotificationsUseCase.execute).toHaveBeenCalledWith(1440);
    });
  });

  describe('When muting with token not loaded in memory', () => {
    beforeEach(async () => {
      (tokenStore.hasToken as jest.Mock).mockReturnValue(false);
      (tokenStore.loadFromStorage as jest.Mock).mockResolvedValue(undefined);
      const response = buildNotificationResponse('MUTE_1H');

      await handleAlertNotificationResponse(response, mockQueryClient);
    });

    it('should load token from storage before muting', () => {
      expect(tokenStore.loadFromStorage).toHaveBeenCalledTimes(1);
      expect(muteNotificationsUseCase.execute).toHaveBeenCalledWith(60);
    });
  });

  describe('When muting fails with an error', () => {
    const muteError = new Error('Network failure');

    beforeEach(async () => {
      (muteNotificationsUseCase.execute as jest.Mock).mockRejectedValue(muteError);
      const response = buildNotificationResponse('MUTE_1H');

      await handleAlertNotificationResponse(response, mockQueryClient);
    });

    it('should catch error and log error message', () => {
      expect(appLogger.error).toHaveBeenCalledWith('notifications', 'Failed to mute notifications via action', muteError);
    });
  });

  describe('When actionIdentifier is DEFAULT_ACTION_IDENTIFIER with redirect url', () => {
    beforeEach(async () => {
      const response = buildNotificationResponse(Notifications.DEFAULT_ACTION_IDENTIFIER, {
        teslaRedirectUrl: 'https://tesla.com/redirect',
      });

      await handleAlertNotificationResponse(response, mockQueryClient);
    });

    it('should clear last notification response', () => {
      expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
    });

    it('should ensure session is valid and invalidate alerts', () => {
      expect(sessionValidator.ensureSessionValid).toHaveBeenCalledTimes(1);
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['alerts'] });
    });

    it('should open tesla app with redirect url', () => {
      expect(openTeslaApp).toHaveBeenCalledWith('https://tesla.com/redirect', undefined);
    });
  });

  describe('When actionIdentifier is OPEN_TESLA with redirect url', () => {
    it('should open tesla app with redirect url', async () => {
      const response = buildNotificationResponse('OPEN_TESLA', {
        teslaRedirectUrl: 'https://tesla.com/open',
      });

      await handleAlertNotificationResponse(response, mockQueryClient);

      expect(openTeslaApp).toHaveBeenCalledWith('https://tesla.com/open', undefined);
    });
  });

  describe('When session validation fails during tesla open', () => {
    const sessionError = new Error('Session expired');

    beforeEach(async () => {
      (sessionValidator.ensureSessionValid as jest.Mock).mockRejectedValue(sessionError);
      const response = buildNotificationResponse('OPEN_TESLA', {
        teslaRedirectUrl: 'https://tesla.com/open',
      });

      await handleAlertNotificationResponse(response, mockQueryClient);
    });

    it('should log error and still attempt to open tesla app', () => {
      expect(appLogger.error).toHaveBeenCalledWith('api', 'Failed to validate session before notification response', sessionError);
      expect(openTeslaApp).toHaveBeenCalledWith('https://tesla.com/open', undefined);
    });
  });

  describe('When the alert carries the VIN of the triggering vehicle', () => {
    it('should open tesla app with that VIN', async () => {
      const response = buildNotificationResponse('OPEN_TESLA', {
        teslaRedirectUrl: 'https://tesla.com/open',
        vin: '5YJ3E1EA7KF000316',
      });

      await handleAlertNotificationResponse(response, mockQueryClient);

      expect(openTeslaApp).toHaveBeenCalledWith('https://tesla.com/open', '5YJ3E1EA7KF000316');
    });
  });

  describe('When the alert carries a VIN that is not a string', () => {
    it('should open tesla app without a VIN', async () => {
      const response = buildNotificationResponse('OPEN_TESLA', {
        teslaRedirectUrl: 'https://tesla.com/open',
        vin: 42,
      });

      await handleAlertNotificationResponse(response, mockQueryClient);

      expect(openTeslaApp).toHaveBeenCalledWith('https://tesla.com/open', undefined);
    });
  });

  describe('When actionIdentifier is DEFAULT_ACTION_IDENTIFIER without redirect url', () => {
    it('should not open tesla app or clear response', async () => {
      const response = buildNotificationResponse(Notifications.DEFAULT_ACTION_IDENTIFIER, {});

      await handleAlertNotificationResponse(response, mockQueryClient);

      expect(Notifications.clearLastNotificationResponse).not.toHaveBeenCalled();
      expect(openTeslaApp).not.toHaveBeenCalled();
    });
  });

  describe('When actionIdentifier is an unhandled action', () => {
    it('should do nothing', async () => {
      const response = buildNotificationResponse('SOME_CUSTOM_ACTION', {
        teslaRedirectUrl: 'https://tesla.com/redirect',
      });

      await handleAlertNotificationResponse(response, mockQueryClient);

      expect(muteNotificationsUseCase.execute).not.toHaveBeenCalled();
      expect(openTeslaApp).not.toHaveBeenCalled();
    });
  });
});
