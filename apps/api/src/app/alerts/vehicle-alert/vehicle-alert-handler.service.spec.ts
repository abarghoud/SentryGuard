import { KafkaMessage } from 'kafkajs';

import { VehicleAlertHandlerService } from './vehicle-alert-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

const buildMessage = (payload: object): KafkaMessage =>
  ({ value: Buffer.from(JSON.stringify(payload)), offset: '1' } as unknown as KafkaMessage);

describe('The VehicleAlertHandlerService class', () => {
  describe('The handleMessage() method', () => {
    let telegramService: { sendSecurityAlert: jest.Mock };
    let alertNotifier: { dispatch: jest.Mock };
    let service: VehicleAlertHandlerService;
    let commit: jest.Mock;

    beforeEach(() => {
      telegramService = { sendSecurityAlert: jest.fn().mockResolvedValue(true) };
      alertNotifier = { dispatch: jest.fn().mockResolvedValue({ userIds: [] }) };
      commit = jest.fn().mockResolvedValue(undefined);
      service = new VehicleAlertHandlerService(
        telegramService as unknown as TelegramService,
        alertNotifier as unknown as VehicleAlertNotifierService
      );
    });

    describe('When the message contains an allowlisted active alert', () => {
      beforeEach(async () => {
        const message = buildMessage({
          vin: 'VIN1',
          createdAt: 'c',
          alerts: [{ name: 'VCSEC_a133_alarmTriggered', audiences: ['service'], endedAt: null }],
        });
        await service.handleMessage(message, commit);
      });

      it('should dispatch the alert with the mapped type and severity', () => {
        expect(alertNotifier.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            alertName: 'VCSEC_a133_alarmTriggered',
            type: AlertEventType.Alarm,
            severity: AlertEventSeverity.Critical,
          })
        );
      });
    });

    describe('When the alert is not in the allowlist', () => {
      beforeEach(async () => {
        const message = buildMessage({
          vin: 'VIN1',
          createdAt: 'c',
          alerts: [{ name: 'SOME_DIAGNOSTIC_CODE', audiences: ['service'], endedAt: null }],
        });
        await service.handleMessage(message, commit);
      });

      it('should not dispatch any alert', () => {
        expect(alertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When the allowlisted alert is already ended', () => {
      beforeEach(async () => {
        const message = buildMessage({
          vin: 'VIN1',
          createdAt: 'c',
          alerts: [{ name: 'VCSEC_a133_alarmTriggered', audiences: ['service'], endedAt: '2026-01-01T00:00:00Z' }],
        });
        await service.handleMessage(message, commit);
      });

      it('should not dispatch any alert', () => {
        expect(alertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When processing completes', () => {
      beforeEach(async () => {
        await service.handleMessage(buildMessage({ vin: 'V', createdAt: 'c', alerts: [] }), commit);
      });

      it('should commit the offset', () => {
        expect(commit).toHaveBeenCalledTimes(1);
      });
    });
  });
});
