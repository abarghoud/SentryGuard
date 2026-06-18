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
    fetchMock = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ data: { status: 'ok' } }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new NotificationsService(mockPreferencesRepository, mockPushDeviceTokenRepository);
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

    describe('When an English user receives a sustained-presence alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.SustainedPresence, 'en');
      });

      it('should send the sustained-presence title', () => {
        expect(lastPushPayload().title).toBe('Someone is lingering');
      });

      it('should send the sustained-presence body', () => {
        expect(lastPushPayload().body).toBe('Someone has been around your vehicle for a while.');
      });
    });

    describe('When an English user receives a final sustained-presence alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.SustainedPresenceFinal, 'en');
      });

      it('should send the final-reminder title', () => {
        expect(lastPushPayload().title).toBe('Last reminder - someone still around');
      });

      it('should send the final-reminder body', () => {
        expect(lastPushPayload().body).toBe('Someone is still around your vehicle. No more alerts for this incident.');
      });
    });

    describe('When an English user receives a panic alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.Panic, 'en');
      });

      it('should send the panic title', () => {
        expect(lastPushPayload().title).toBe('Alarm triggered');
      });

      it('should send the panic body', () => {
        expect(lastPushPayload().body).toBe('Your vehicle alarm may be sounding.');
      });
    });

    describe('When a French user receives a panic alert', () => {
      beforeEach(async () => {
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.Panic, 'fr');
      });

      it('should send the localized French title', () => {
        expect(lastPushPayload().title).toBe('Alarme déclenchée');
      });
    });

    describe('When the user has no eligible device', () => {
      beforeEach(async () => {
        mockPushDeviceTokenRepository.find.mockResolvedValue([]);
        await service.sendPushAlert(fakeUserId, AlertEventSeverity.Critical, AlertEventType.BreakIn, 'fr');
      });

      it('should not call the push service', () => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });
  });
});
