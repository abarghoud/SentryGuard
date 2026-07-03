import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { NotificationsService } from './notifications.service';
import { NotificationPreferences } from '../../entities/notification-preferences.entity';
import { PushDeviceToken } from '../../entities/push-device-token.entity';
import { AlertEventSeverity, AlertEventType } from '../../entities/alert-event.entity';
import { DevicesService } from '../devices/devices.service';

describe('The NotificationsService class', () => {
  const fakeUserId = 'user-123';
  const fakeVin = 'VIN-1';
  let mockPreferencesRepository: MockProxy<Repository<NotificationPreferences>>;
  let mockPushDeviceTokenRepository: MockProxy<Repository<PushDeviceToken>>;
  let mockDevicesService: MockProxy<DevicesService>;
  let fetchMock: jest.Mock;
  let service: NotificationsService;

  const createDevice = (installationId?: string): PushDeviceToken =>
    ({
      critical_alerts_enabled: false,
      critical_only: false,
      installationId: installationId ?? null,
      push_enabled: true,
      token: 'ExponentPushToken[fake]',
      userId: fakeUserId,
    }) as PushDeviceToken;

  const lastPushPayload = (): { body: string; title: string } => JSON.parse(fetchMock.mock.calls[0][1].body);

  beforeEach(() => {
    mockPreferencesRepository = mock<Repository<NotificationPreferences>>();
    mockPushDeviceTokenRepository = mock<Repository<PushDeviceToken>>();
    mockDevicesService = mock<DevicesService>();
    mockPushDeviceTokenRepository.find.mockResolvedValue([createDevice()]);
    mockDevicesService.getInstallationIdsHidingVehicle.mockResolvedValue(new Set());
    fetchMock = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ data: { status: 'ok' } }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new NotificationsService(mockPreferencesRepository, mockPushDeviceTokenRepository, mockDevicesService);
  });

  describe('The sendPushAlert() method', () => {
    describe('When a French user receives a break-in alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'fr', fakeVin);
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
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'en', fakeVin);
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
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Warning, AlertEventType.Sentry, 'fr', fakeVin);
      });

      it('should send the localized French title', () => {
        expect(lastPushPayload().title).toBe('Alerte Sentinelle');
      });
    });

    describe('When an English user receives a Sentry alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Warning, AlertEventType.Sentry, 'en', fakeVin);
      });

      it('should send the localized English title', () => {
        expect(lastPushPayload().title).toBe('Sentry alert');
      });

      it('should send the localized English body', () => {
        expect(lastPushPayload().body).toBe('A Sentry event was detected.');
      });
    });

    describe('When the user has no eligible device', () => {
      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([]);
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'fr', fakeVin);
      });

      it('should not call the push service', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });

    describe('When the vehicle is hidden on the target device', () => {
      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([createDevice('installation-1')]);
        mockDevicesService.getInstallationIdsHidingVehicle.mockResolvedValue(new Set(['installation-1']));
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'fr', fakeVin);
      });

      it('should not push to that device', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });

    describe('When the vehicle is hidden on another device only', () => {
      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([createDevice('installation-2')]);
        mockDevicesService.getInstallationIdsHidingVehicle.mockResolvedValue(new Set(['installation-1']));
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'fr', fakeVin);
      });

      it('should still push to this device', () => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('When no device carries an installation id', () => {
      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([createDevice()]);
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'fr', fakeVin);
      });

      it('should not query the hidden-vehicle installations', () => {
        expect(mockDevicesService.getInstallationIdsHidingVehicle).not.toHaveBeenCalled();
      });

      it('should still push to the device', () => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
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
          { conflictPaths: ['token'], skipUpdateIfNoValuesChanged: true }
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

    describe('When the registered device reports a new installation id', () => {
      let existingDevice: PushDeviceToken;

      beforeEach(async () => {
        existingDevice = { ...createDevice(), platform: 'android', push_enabled: false };
        mockPushDeviceTokenRepository.findOne.mockResolvedValue(existingDevice);
        await service.registerPushToken(fakeUserId, fakeToken, 'android', 'installation-1');
      });

      it('should backfill the installation id on the saved device', () => {
        expect(mockPushDeviceTokenRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ installationId: 'installation-1' })
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
