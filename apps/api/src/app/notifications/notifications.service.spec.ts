import { Logger } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { NotificationsService, PushDeliveryResult } from './notifications.service';
import { NotificationPreferences } from '../../entities/notification-preferences.entity';
import { PushDeviceToken } from '../../entities/push-device-token.entity';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { AlertEventSeverity, AlertEventType } from '../../entities/alert-event.entity';
import { AlertSound } from '../alerts/enums/alert-sound.enum';
import { CounterMeasure } from '../alerts/enums/counter-measure.enum';

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

  const lastPushPayload = (): { body: string; channelId: string; data: { vin?: string }; sound?: string; title: string } =>
    JSON.parse(fetchMock.mock.calls[0][1].body);

  beforeEach(() => {
    mockPreferencesRepository = mock<Repository<NotificationPreferences>>();
    mockPreferencesRepository.findOne.mockResolvedValue({
      telegram_enabled: true,
      userId: fakeUserId,
    } as NotificationPreferences);
    mockPreferencesRepository.create.mockReturnValue({
      telegram_enabled: true,
      userId: fakeUserId,
    } as NotificationPreferences);
    mockPreferencesRepository.save.mockImplementation((pref) => Promise.resolve(pref as NotificationPreferences));
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

  describe('The sendCounterMeasurePush() method', () => {
    const counterMeasureContext = {
      counterMeasures: [CounterMeasure.Honk, CounterMeasure.AutoSentry],
      userId: fakeUserId,
      userLanguage: 'fr' as const,
      vehicleName: 'Ma Tesla',
      vin: 'XP7YGCER1TB919128',
    };

    describe('When the user has a device accepting regular notifications', () => {
      let result: PushDeliveryResult;

      beforeEach(async () => {
        result = await service.sendCounterMeasurePush(counterMeasureContext);
      });

      it('should report the push as sent', () => {
        expect(result).toStrictEqual({ isDelivered: true });
      });

      it('should name the vehicle in the title', () => {
        expect(lastPushPayload().title).toBe('Riposte déclenchée - Ma Tesla');
      });

      it('should list the counter-measures that went off', () => {
        expect(lastPushPayload().body).toBe('Le klaxon a retenti. Le mode Sentinelle a été activé.');
      });

      it('should use the regular alerts channel', () => {
        expect(lastPushPayload().channelId).toBe('sentryguard-alerts');
      });

      it('should keep the VIN so tapping opens the vehicle camera', () => {
        expect(lastPushPayload().data.vin).toBe('XP7YGCER1TB919128');
      });
    });

    describe('When the device only accepts critical alerts', () => {
      let result: PushDeliveryResult;

      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([{ ...createDevice(), critical_only: true } as PushDeviceToken]);

        result = await service.sendCounterMeasurePush(counterMeasureContext);
      });

      it('should not send any push', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('should report that nothing was sent', () => {
        expect(result).toStrictEqual({ isDelivered: false });
      });
    });
  });

  describe('The sendPushAlert() method', () => {
    describe('When a French user receives a break-in alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'fr' });
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
        await service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'en' });
      });

      it('should send the localized English title', () => {
        expect(lastPushPayload().title).toBe('Intrusion alert');
      });

      it('should send the localized English body', () => {
        expect(lastPushPayload().body).toBe('A break-in attempt was detected.');
      });

      it('should include the sound configured in preferences', () => {
        expect(lastPushPayload().sound).toBe('sentry_siren.wav');
      });
    });

    describe('When a French user receives a break-in alert hours after it was detected', () => {
      beforeEach(async () => {
        const now = new Date('2026-11-20T00:26:00.000Z');
        jest.useFakeTimers({ now });

        await service.sendPushAlert({
          alertSound: AlertSound.SentrySiren,
          detectedAt: new Date(now.getTime() - (2 * 60 + 5) * 60_000),
          severity: AlertEventSeverity.Critical,
          type: AlertEventType.BreakIn,
          userId: fakeUserId,
          userLanguage: 'fr',
        });
      });

      it('should say in the body how long ago the alert was detected', () => {
        expect(lastPushPayload().body).toBe('Une tentative d’intrusion a été détectée.\nAlerte retardée : détectée il y a 2 h 5 min.');
      });
    });

    describe('When an English user receives a Sentry alert right after it was detected', () => {
      beforeEach(async () => {
        await service.sendPushAlert({
          alertSound: AlertSound.SentrySiren,
          detectedAt: new Date(Date.now() - 30_000),
          severity: AlertEventSeverity.Warning,
          type: AlertEventType.Sentry,
          userId: fakeUserId,
          userLanguage: 'en',
        });
      });

      it('should keep the usual body', () => {
        expect(lastPushPayload().body).toBe('A Sentry event was detected.');
      });
    });

    describe('When a French user receives a Sentry alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Warning, type: AlertEventType.Sentry, userId: fakeUserId, userLanguage: 'fr' });
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
        await service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Warning, type: AlertEventType.Sentry, userId: fakeUserId, userLanguage: 'en' });
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

    describe('When the device has critical alerts enabled and the alert is critical', () => {
      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([
          { ...createDevice(), critical_alerts_enabled: true },
        ]);
        await service.sendPushAlert({ alertSound: AlertSound.CyberPulse, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'en' });
      });

      it('should target the critical channel carrying the chosen sound', () => {
        expect(lastPushPayload().channelId).toBe('sentryguard-critical-cyber_pulse');
      });
    });

    describe('When the device has critical alerts disabled', () => {
      beforeEach(async () => {
        await service.sendPushAlert({ alertSound: AlertSound.CyberPulse, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'en' });
      });

      it('should target the standard channel carrying the chosen sound', () => {
        expect(lastPushPayload().channelId).toBe('sentryguard-alerts-cyber_pulse');
      });
    });

    describe('When the alert sound is the phone default and the alert is critical', () => {
      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([
          { ...createDevice(), critical_alerts_enabled: true },
        ]);
        await service.sendPushAlert({
          alertSound: AlertSound.PhoneDefault,
          severity: AlertEventSeverity.Critical,
          type: AlertEventType.BreakIn,
          userId: fakeUserId,
          userLanguage: 'en',
        });
      });

      it('should target the channel that carries no custom sound', () => {
        expect(lastPushPayload().channelId).toBe('sentryguard-critical-alerts-v5');
      });

      it('should ask iOS for its own sound', () => {
        expect(lastPushPayload().sound).toBe('default');
      });
    });

    describe('When the alert sound is the phone default and the alert is not critical', () => {
      beforeEach(async () => {
        await service.sendPushAlert({
          alertSound: AlertSound.PhoneDefault,
          severity: AlertEventSeverity.Warning,
          type: AlertEventType.Sentry,
          userId: fakeUserId,
          userLanguage: 'en',
        });
      });

      it('should target the channel that carries no custom sound', () => {
        expect(lastPushPayload().channelId).toBe('sentryguard-alerts');
      });

      it('should ask iOS for its own sound', () => {
        expect(lastPushPayload().sound).toBe('default');
      });
    });

    describe('When a vehicle name is provided for an English user', () => {
      beforeEach(async () => {
        await service.sendPushAlert({
          alertSound: AlertSound.SentrySiren,
          severity: AlertEventSeverity.Warning,
          type: AlertEventType.Sentry,
          userId: fakeUserId,
          userLanguage: 'en',
          vehicleName: 'Model Y',
        });
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
        await service.sendPushAlert({
          alertSound: AlertSound.SentrySiren,
          severity: AlertEventSeverity.Warning,
          type: AlertEventType.Sentry,
          userId: fakeUserId,
          userLanguage: 'fr',
          vehicleName: 'Model Y',
        });
      });

      it('should append the localized vehicle name suffix to the title', () => {
        expect(lastPushPayload().title).toBe('Alerte Sentinelle - Model Y');
      });
    });

    describe('When the alerting VIN is provided', () => {
      beforeEach(async () => {
        await service.sendPushAlert({
          alertSound: AlertSound.SentrySiren,
          severity: AlertEventSeverity.Warning,
          type: AlertEventType.Sentry,
          userId: fakeUserId,
          userLanguage: 'en',
          vehicleName: 'Model Y',
          vin: '5YJ3E1EA7KF000316',
        });
      });

      it('should carry it in the push data payload', () => {
        expect(lastPushPayload().data.vin).toBe('5YJ3E1EA7KF000316');
      });
    });

    describe('When no alerting VIN is provided', () => {
      beforeEach(async () => {
        await service.sendPushAlert({
          alertSound: AlertSound.SentrySiren,
          severity: AlertEventSeverity.Warning,
          type: AlertEventType.Sentry,
          userId: fakeUserId,
          userLanguage: 'en',
        });
      });

      it('should omit the VIN from the push data payload', () => {
        expect(lastPushPayload().data.vin).toBeUndefined();
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
        const result = await service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Warning, type: AlertEventType.Sentry, userId: fakeUserId, userLanguage: 'fr' });
        expect(result).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('should not suppress break-in alerts and return true', async () => {
        const result = await service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'fr' });
        expect(result).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the user has no eligible device', () => {
      let result: boolean;

      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([]);
        result = await service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'fr' });
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
          service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'en' })
        ).rejects.toThrow('Service unavailable');
      });
    });

    describe('When the Expo request fails', () => {
      beforeEach(() => {
        fetchMock.mockRejectedValue(new Error('Network error'));
      });

      it('should reject so the outbox can retry the notification', async () => {
        await expect(
          service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'en' })
        ).rejects.toThrow('Network error');
      });
    });

    describe('When the Expo request times out', () => {
      it('should reject so the outbox can retry the notification', async () => {
        jest.useFakeTimers();
        fetchMock.mockImplementation((_url: string, options: RequestInit) => new Promise<Response>((_, reject) => {
          options.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }));

        const result = service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'en' });
        const rejection = expect(result).rejects.toThrow('ETIMEDOUT: Expo push request timed out after 10000ms');
        await jest.advanceTimersByTimeAsync(10000);

        await rejection;
      });
    });

    describe('When Expo is temporarily unavailable', () => {
      const pushContext = {
        alertSound: AlertSound.SentrySiren,
        correlationId: 'corr-test',
        severity: AlertEventSeverity.Critical,
        type: AlertEventType.BreakIn,
        userId: fakeUserId,
        userLanguage: 'en' as const,
      };
      const buildExpoResponse = (status: number, body: object, headers: Record<string, string> = {}) => ({
        headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
        json: () => Promise.resolve(body),
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 503 ? 'Service Unavailable' : status === 429 ? 'Too Many Requests' : 'OK',
      });
      const unavailableResponse = () => buildExpoResponse(503, {});
      const okResponse = () => buildExpoResponse(200, { data: { id: 'fake-ticket', status: 'ok' } });

      beforeEach(() => {
        jest.useFakeTimers();
      });

      describe('When the first attempt gets a 503 and the retry succeeds', () => {
        let result: Promise<boolean>;

        beforeEach(async () => {
          fetchMock.mockResolvedValueOnce(unavailableResponse()).mockResolvedValueOnce(okResponse());
          result = service.sendPushAlert(pushContext);
          await jest.advanceTimersByTimeAsync(999);
        });

        it('should wait 1s before retrying', async () => {
          expect(fetchMock).toHaveBeenCalledTimes(1);
          await jest.advanceTimersByTimeAsync(1);
          expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it('should report the push as delivered', async () => {
          await jest.advanceTimersByTimeAsync(1);
          await expect(result).resolves.toBe(true);
        });
      });

      describe('When every attempt gets a 503', () => {
        let rejection: Promise<void>;

        beforeEach(async () => {
          fetchMock.mockImplementation(() => Promise.resolve(unavailableResponse()));
          rejection = expect(service.sendPushAlert(pushContext)).rejects.toMatchObject({ message: 'Service Unavailable', status: 503 });
          await jest.advanceTimersByTimeAsync(1000);
          await jest.advanceTimersByTimeAsync(3000);
          await rejection;
        });

        it('should retry twice, after 1s then 3s, and stop', async () => {
          await jest.advanceTimersByTimeAsync(10000);
          expect(fetchMock).toHaveBeenCalledTimes(3);
        });
      });

      describe('When Expo rate-limits the request with a Retry-After header', () => {
        it('should wait for the Retry-After delay before retrying', async () => {
          fetchMock.mockResolvedValueOnce(buildExpoResponse(429, {}, { 'retry-after': '2' })).mockResolvedValueOnce(okResponse());

          const result = service.sendPushAlert(pushContext);
          await jest.advanceTimersByTimeAsync(1999);
          expect(fetchMock).toHaveBeenCalledTimes(1);

          await jest.advanceTimersByTimeAsync(1);
          await expect(result).resolves.toBe(true);
          expect(fetchMock).toHaveBeenCalledTimes(2);
        });
      });

      describe('When the connection is reset before Expo answers', () => {
        it('should retry and deliver the push', async () => {
          const networkError = Object.assign(new TypeError('fetch failed'), {
            cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }),
          });
          fetchMock.mockRejectedValueOnce(networkError).mockResolvedValueOnce(okResponse());

          const result = service.sendPushAlert(pushContext);
          await jest.advanceTimersByTimeAsync(1000);

          await expect(result).resolves.toBe(true);
          expect(fetchMock).toHaveBeenCalledTimes(2);
        });
      });

      describe('When Expo rejects the request with a client error', () => {
        it('should not retry', async () => {
          fetchMock.mockResolvedValue(buildExpoResponse(400, { errors: [{ code: 'VALIDATION_ERROR', message: 'Invalid push token' }] }));

          await expect(service.sendPushAlert(pushContext)).rejects.toThrow('Invalid push token');
          expect(fetchMock).toHaveBeenCalledTimes(1);
        });
      });

      describe('When the request times out', () => {
        it('should not retry, to avoid notifying twice', async () => {
          fetchMock.mockImplementation((_url: string, options: RequestInit) => new Promise<Response>((_, reject) => {
            options.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }));

          const rejection = expect(service.sendPushAlert(pushContext)).rejects.toThrow('ETIMEDOUT');
          await jest.advanceTimersByTimeAsync(10000);
          await rejection;
          await jest.advanceTimersByTimeAsync(10000);

          expect(fetchMock).toHaveBeenCalledTimes(1);
        });
      });

      describe('When Expo answers 503 only after 9.6s each time', () => {
        it('should keep the whole send within the 20s budget', async () => {
          fetchMock.mockImplementation((_url: string, options: RequestInit) => new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve(unavailableResponse()), 9_600);
            options.signal?.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('aborted'));
            });
          }));

          const rejection = expect(service.sendPushAlert(pushContext)).rejects.toThrow('ETIMEDOUT');
          await jest.advanceTimersByTimeAsync(20_000);
          await rejection;

          expect(fetchMock).toHaveBeenCalledTimes(2);
        });
      });

      describe('When Expo answers 200 without any ok ticket', () => {
        it('should not count the push as delivered', async () => {
          fetchMock.mockResolvedValue(buildExpoResponse(200, { data: { message: 'Message too big', status: 'error' } }));

          await expect(service.sendPushAlert(pushContext)).rejects.toThrow('Message too big');
          expect(fetchMock).toHaveBeenCalledTimes(1);
        });
      });

      describe('When Expo answers with a list of tickets and one is ok', () => {
        it('should count the push as delivered', async () => {
          fetchMock.mockResolvedValue(buildExpoResponse(200, { data: [{ message: 'Error', status: 'error' }, { id: 'fake-ticket', status: 'ok' }] }));

          await expect(service.sendPushAlert(pushContext)).resolves.toBe(true);
        });
      });

      describe('When the push finally fails', () => {
        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should log the HTTP status of the failure', async () => {
          const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
          fetchMock.mockImplementation(() => Promise.resolve(unavailableResponse()));

          const rejection = expect(service.sendPushAlert(pushContext)).rejects.toThrow('Service Unavailable');
          await jest.advanceTimersByTimeAsync(4000);
          await rejection;

          expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/\[NOTIFICATION_ERROR\] Failed to send push notification: .*status=503/));
        });
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
          service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'en' })
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

        result = await service.sendPushAlert({ alertSound: AlertSound.SentrySiren, severity: AlertEventSeverity.Critical, type: AlertEventType.BreakIn, userId: fakeUserId, userLanguage: 'en' });
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
