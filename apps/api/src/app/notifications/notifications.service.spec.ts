import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { NotificationsService } from './notifications.service';
import { NotificationPreferences } from '../../entities/notification-preferences.entity';
import { PushDeviceToken } from '../../entities/push-device-token.entity';
import { AlertEventSeverity, AlertEventType } from '../../entities/alert-event.entity';

describe('The NotificationsService class', () => {
  const fakeUserId = 'user-123';
  let mockPreferencesRepository: MockProxy<Repository<NotificationPreferences>>;
  let mockPushDeviceTokenRepository: MockProxy<Repository<PushDeviceToken>>;
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

  const lastPushPayload = (): { body: string; title: string } => JSON.parse(fetchMock.mock.calls[0][1].body);

  beforeEach(() => {
    mockPreferencesRepository = mock<Repository<NotificationPreferences>>();
    mockPushDeviceTokenRepository = mock<Repository<PushDeviceToken>>();
    mockPushDeviceTokenRepository.find.mockResolvedValue([createDevice()]);
    fetchMock = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: { status: 'ok' } }),
      ok: true,
      statusText: 'OK',
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new NotificationsService(mockPreferencesRepository, mockPushDeviceTokenRepository);
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
    });

    describe('When a French user receives a Sentry alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Warning, AlertEventType.Sentry, 'fr');
      });

      it('should send the localized French title', () => {
        expect(lastPushPayload().title).toBe('Alerte Sentinelle');
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
});
