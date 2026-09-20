import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { NotificationsService } from './notifications.service';
import { NotificationPreferences } from '../../entities/notification-preferences.entity';
import { PushDeviceToken } from '../../entities/push-device-token.entity';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { AlertEventSeverity, AlertEventType } from '../../entities/alert-event.entity';

describe('The NotificationsService class', () => {
  const fakeUserId = 'user-123';
  let mockPreferencesRepository: MockProxy<Repository<NotificationPreferences>>;
  let mockPushDeviceTokenRepository: MockProxy<Repository<PushDeviceToken>>;
  let mockTelegramConfigRepository: MockProxy<Repository<TelegramConfig>>;
  let fetchMock: jest.Mock;
  let service: NotificationsService;

  const createDevice = (): PushDeviceToken =>
    ({
      critical_alerts_enabled: false,
      critical_only: false,
      push_enabled: true,
      token: 'ExponentPushToken[fake]',
      userId: fakeUserId,
    }) as PushDeviceToken;

  const lastPushPayload = (): { body: string; sound?: string; title: string } => JSON.parse(fetchMock.mock.calls[0][1].body);

  beforeEach(() => {
    mockPreferencesRepository = mock<Repository<NotificationPreferences>>();
    mockPushDeviceTokenRepository = mock<Repository<PushDeviceToken>>();
    mockTelegramConfigRepository = mock<Repository<TelegramConfig>>();
    mockPushDeviceTokenRepository.find.mockResolvedValue([createDevice()]);
    fetchMock = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: { status: 'ok' } }),
      ok: true,
      statusText: 'OK',
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new NotificationsService(
      mockPreferencesRepository,
      mockPushDeviceTokenRepository,
      mockTelegramConfigRepository
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('The sendPushAlert() method', () => {
    describe('When a French user receives a break-in alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'fr');
      });

      it('should send the localized French title', () => {
        expect(lastPushPayload().title).toBe('Alerte intrusion');
      });

      it('should send the localized French body', () => {
        expect(lastPushPayload().body).toBe('Une tentative d’intrusion a été détectée.');
      });
    });

    describe('When an English user receives a break-in alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'en');
      });

      it('should send the localized English title', () => {
        expect(lastPushPayload().title).toBe('Intrusion alert');
      });

      it('should send the localized English body', () => {
        expect(lastPushPayload().body).toBe('A break-in attempt was detected.');
      });

      it('should include the default sound', () => {
        expect(lastPushPayload().sound).toBe('default');
      });
    });

    describe('When a French user receives a Sentry alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Warning, AlertEventType.Sentry, 'fr');
      });

      it('should send the localized French title', () => {
        expect(lastPushPayload().title).toBe('Alerte Sentinelle');
      });

      it('should include sentry_alert categoryId for quick actions', () => {
        const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(payload.categoryId).toBe('sentry_alert');
      });
    });

    describe('When an English user receives a Sentry alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Warning, AlertEventType.Sentry, 'en');
      });

      it('should send the localized English title', () => {
        expect(lastPushPayload().title).toBe('Sentry alert');
      });

      it('should send the localized English body', () => {
        expect(lastPushPayload().body).toBe('A Sentry event was detected.');
      });

      it('should include sentry_alert categoryId for quick actions', () => {
        const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(payload.categoryId).toBe('sentry_alert');
      });
    });

    describe('When a vehicle name is provided for an English user', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Warning, AlertEventType.Sentry, 'en', undefined, 'Model Y');
      });

      it('should append the vehicle name to the title', () => {
        expect(lastPushPayload().title).toBe('Sentry alert - Model Y');
      });

      it('should leave the body unchanged', () => {
        expect(lastPushPayload().body).toBe('A Sentry event was detected.');
      });
    });

    describe('When a vehicle name is provided for a French user', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Warning, AlertEventType.Sentry, 'fr', undefined, 'Model Y');
      });

      it('should append the localized vehicle name suffix to the title', () => {
        expect(lastPushPayload().title).toBe('Alerte Sentinelle - Model Y');
      });
    });

    describe('When the user has alerts muted', () => {
      beforeEach(() => {
        mockPreferencesRepository.findOne.mockResolvedValue({
          muted_until: new Date(Date.now() + 3600000),
          userId: fakeUserId,
        } as NotificationPreferences);
      });

      it('should suppress Sentry alerts and return false', async () => {
        const result = await service.sendPushAlert(
          fakeUserId,
          AlertEventSeverity.Warning,
          AlertEventType.Sentry,
          'fr'
        );
        expect(result).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('should not suppress break-in alerts and return true', async () => {
        const result = await service.sendPushAlert(
          fakeUserId,
          AlertEventSeverity.Critical,
          AlertEventType.BreakIn,
          'fr'
        );
        expect(result).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the user has no eligible device', () => {
      let result: boolean;

      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([]);
        result = await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'fr');
      });

      it('should not call the push service', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('should return false', () => {
        expect(result).toBe(false);
      });
    });

    describe('When Expo rejects the notification', () => {
      beforeEach(() => {
        fetchMock.mockResolvedValue({
          json: () => Promise.resolve({ data: { message: 'Service unavailable', status: 'error' } }),
          ok: false,
          statusText: 'Service Unavailable',
        });
      });

      it('should reject so the outbox can retry the notification', async () => {
        await expect(
          service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'en')
        ).rejects.toThrow('Service unavailable');
      });
    });

    describe('When the Expo request fails', () => {
      beforeEach(() => {
        fetchMock.mockRejectedValue(new Error('Network error'));
      });

      it('should reject so the outbox can retry the notification', async () => {
        await expect(
          service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'en')
        ).rejects.toThrow('Network error');
      });
    });

    describe('When the Expo request times out', () => {
      it('should reject so the outbox can retry the notification', async () => {
        jest.useFakeTimers();
        fetchMock.mockImplementation((_url: string, options: RequestInit) => new Promise<Response>((_, reject) => {
          options.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }));

        const result = service.sendPushAlert(
          fakeUserId,
          AlertEventSeverity.Critical,
          AlertEventType.BreakIn,
          'en'
        );
        const rejection = expect(result).rejects.toThrow('ETIMEDOUT: Expo push request timed out after 10000ms');
        await jest.advanceTimersByTimeAsync(10000);

        await rejection;
      });
    });

    describe('When Expo invalidates the device token and no other devices exist', () => {
      beforeEach(() => {
        fetchMock.mockResolvedValue({
          json: () => Promise.resolve({
            data: {
              details: { error: 'DeviceNotRegistered' },
              message: 'Device is not registered',
              status: 'error',
            },
          }),
          ok: false,
          statusText: 'Bad Request',
        });
      });

      it('should remove the invalid token before rejecting', async () => {
        await expect(
          service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'en')
        ).rejects.toThrow('Device is not registered');
        expect(mockPushDeviceTokenRepository.delete).toHaveBeenCalledWith({ id: undefined });
      });
    });

    describe('When one device has a stale token but another device succeeds', () => {
      let result: boolean;

      beforeEach(async () => {
        const staleDevice = { ...createDevice(), id: 'stale-device', token: 'ExponentPushToken[stale]' };
        const healthyDevice = { ...createDevice(), id: 'healthy-device', token: 'ExponentPushToken[healthy]' };
        mockPushDeviceTokenRepository.find.mockResolvedValue([staleDevice, healthyDevice]);

        fetchMock.mockImplementation((_url: string, init: RequestInit) => {
          const body = JSON.parse(init.body as string);
          if (body.to === 'ExponentPushToken[stale]') {
            return Promise.resolve({
              json: () => Promise.resolve({
                data: { details: { error: 'DeviceNotRegistered' }, message: 'Device is not registered', status: 'error' },
              }),
              ok: false,
              statusText: 'Bad Request',
            });
          }
          return Promise.resolve({
            json: () => Promise.resolve({ data: { status: 'ok' } }),
            ok: true,
            statusText: 'OK',
          });
        });

        result = await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'en');
      });

      it('should remove the stale device', () => {
        expect(mockPushDeviceTokenRepository.delete).toHaveBeenCalledWith({ id: 'stale-device' });
      });

      it('should succeed and return true', () => {
        expect(result).toBe(true);
      });
    });
  });

  describe('The registerPushToken() method', () => {
    const fakeToken = 'ExponentPushToken[fake]';

    describe('When the device token is new', () => {
      beforeEach(async () => {
        mockPushDeviceTokenRepository.findOne.mockResolvedValue(null);
        await service.registerPushToken(fakeUserId, fakeToken, 'android');
      });

      it('should create the device with push enabled', () => {
        expect(mockPushDeviceTokenRepository.upsert).toHaveBeenCalledWith(
          { userId: fakeUserId, token: fakeToken, platform: 'android', push_enabled: true },
          { conflictPaths: ['userId', 'token'], skipUpdateIfNoValuesChanged: true }
        );
      });
    });

    describe('When the device token is already registered with push disabled', () => {
      let existingDevice: PushDeviceToken;

      beforeEach(async () => {
        existingDevice = { ...createDevice(), platform: 'android', push_enabled: false };
        mockPushDeviceTokenRepository.findOne.mockResolvedValue(existingDevice);
        await service.registerPushToken(fakeUserId, fakeToken, 'android');
      });

      it('should not re-enable push on the existing device', () => {
        expect(mockPushDeviceTokenRepository.upsert).not.toHaveBeenCalled();
      });

      it('should not rewrite the unchanged device', () => {
        expect(mockPushDeviceTokenRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('When the registered device reports a new platform', () => {
      let existingDevice: PushDeviceToken;

      beforeEach(async () => {
        existingDevice = { ...createDevice(), platform: 'ios', push_enabled: false };
        mockPushDeviceTokenRepository.findOne.mockResolvedValue(existingDevice);
        await service.registerPushToken(fakeUserId, fakeToken, 'android');
      });

      it('should save the device with the new platform', () => {
        expect(mockPushDeviceTokenRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ platform: 'android' })
        );
      });

      it('should keep push disabled on the saved device', () => {
        expect(mockPushDeviceTokenRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ push_enabled: false })
        );
      });
    });
  });

  describe('The mute() method', () => {
    describe('When muting notifications for 60 minutes', () => {
      let mutedUntil: Date;

      beforeEach(async () => {
        mockPreferencesRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
        } as NotificationPreferences);
        mockPreferencesRepository.save.mockImplementation(async (pref) => pref as NotificationPreferences);
        mutedUntil = await service.mute(fakeUserId, 60);
      });

      it('should save the future muted_until date in preferences', () => {
        expect(mockPreferencesRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ muted_until: mutedUntil })
        );
      });

      it('should sync the muted_until date to telegram config', () => {
        expect(mockTelegramConfigRepository.update).toHaveBeenCalledWith(
          { userId: fakeUserId },
          { muted_until: mutedUntil }
        );
      });
    });
  });

  describe('The unmute() method', () => {
    describe('When unmuting notifications', () => {
      beforeEach(async () => {
        mockPreferencesRepository.findOne.mockResolvedValue({
          muted_until: new Date(),
          userId: fakeUserId,
        } as NotificationPreferences);
        await service.unmute(fakeUserId);
      });

      it('should set muted_until to null in preferences', () => {
        expect(mockPreferencesRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ muted_until: null })
        );
      });

      it('should set muted_until to null in telegram config', () => {
        expect(mockTelegramConfigRepository.update).toHaveBeenCalledWith(
          { userId: fakeUserId },
          { muted_until: null }
        );
      });
    });
  });

  describe('The isMuted() method', () => {
    describe('When muted_until is in the future', () => {
      beforeEach(() => {
        mockPreferencesRepository.findOne.mockResolvedValue({
          muted_until: new Date(Date.now() + 60000),
          userId: fakeUserId,
        } as NotificationPreferences);
      });

      it('should return true', async () => {
        const result = await service.isMuted(fakeUserId);
        expect(result).toBe(true);
      });
    });

    describe('When muted_until is in the past', () => {
      beforeEach(() => {
        mockPreferencesRepository.findOne.mockResolvedValue({
          muted_until: new Date(Date.now() - 60000),
          userId: fakeUserId,
        } as NotificationPreferences);
      });

      it('should return false', async () => {
        const result = await service.isMuted(fakeUserId);
        expect(result).toBe(false);
      });
    });

    describe('When muted_until is null', () => {
      beforeEach(() => {
        mockPreferencesRepository.findOne.mockResolvedValue({
          muted_until: null,
          userId: fakeUserId,
        } as NotificationPreferences);
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should return false', async () => {
        const result = await service.isMuted(fakeUserId);
        expect(result).toBe(false);
      });
    });

    describe('When preferences has no mute but telegram config is muted', () => {
      beforeEach(() => {
        mockPreferencesRepository.findOne.mockResolvedValue(null);
        mockTelegramConfigRepository.findOne.mockResolvedValue({
          muted_until: new Date(Date.now() + 60000),
          status: TelegramLinkStatus.LINKED,
          userId: fakeUserId,
        } as TelegramConfig);
      });

      it('should return true', async () => {
        const result = await service.isMuted(fakeUserId);
        expect(result).toBe(true);
      });
    });
  });
});
