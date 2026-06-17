import { KafkaMessage } from 'kafkajs';
import { Repository } from 'typeorm';

import { VehicleAlertHandlerService } from './vehicle-alert-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertsOffensiveResponseService } from '../../offensive-response/alerts-offensive-response.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

const buildMessage = (payload: object): KafkaMessage =>
  ({ value: Buffer.from(JSON.stringify(payload)), offset: '1' } as unknown as KafkaMessage);

const alarmAlert = { name: 'VCSEC_a133_alarmTriggered', audiences: ['service'], endedAt: null };
const intrusionAlert = { name: 'VCSEC_a211_handlePullWithoutAuth', audiences: ['service'], endedAt: null };

describe('The VehicleAlertHandlerService class', () => {
  describe('The handleMessage() method', () => {
    let telegramService: { sendSecurityAlert: jest.Mock };
    let alertNotifier: { dispatch: jest.Mock };
    let offensiveResponseService: { handleBreakInOffensiveResponse: jest.Mock };
    let vehicleRepository: { count: jest.Mock };
    let service: VehicleAlertHandlerService;
    let commit: jest.Mock;

    beforeEach(() => {
      telegramService = { sendSecurityAlert: jest.fn().mockResolvedValue(true) };
      alertNotifier = { dispatch: jest.fn().mockResolvedValue({ userIds: ['user-1'] }) };
      offensiveResponseService = { handleBreakInOffensiveResponse: jest.fn().mockResolvedValue(undefined) };
      vehicleRepository = { count: jest.fn().mockResolvedValue(1) };
      commit = jest.fn().mockResolvedValue(undefined);
      service = new VehicleAlertHandlerService(
        telegramService as unknown as TelegramService,
        alertNotifier as unknown as VehicleAlertNotifierService,
        offensiveResponseService as unknown as AlertsOffensiveResponseService,
        vehicleRepository as unknown as Repository<Vehicle>
      );
    });

    describe('When an allowlisted active alert arrives and break-in monitoring is enabled', () => {
      beforeEach(async () => {
        await service.handleMessage(buildMessage({ vin: 'VIN1', createdAt: 'c', alerts: [alarmAlert] }), commit);
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

    describe('When break-in monitoring is disabled for the vehicle', () => {
      beforeEach(async () => {
        vehicleRepository.count.mockResolvedValue(0);
        await service.handleMessage(buildMessage({ vin: 'VIN1', createdAt: 'c', alerts: [alarmAlert] }), commit);
      });

      it('should not dispatch any alert', () => {
        expect(alertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When the alert is an intrusion attempt', () => {
      beforeEach(async () => {
        await service.handleMessage(buildMessage({ vin: 'VIN1', createdAt: 'c', alerts: [intrusionAlert] }), commit);
      });

      it('should trigger the offensive response', () => {
        expect(offensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledWith('VIN1', ['user-1'], 'c');
      });
    });

    describe('When the alert is an alarm', () => {
      beforeEach(async () => {
        await service.handleMessage(buildMessage({ vin: 'VIN1', createdAt: 'c', alerts: [alarmAlert] }), commit);
      });

      it('should not trigger the offensive response', () => {
        expect(offensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
      });
    });

    describe('When the alert is not in the allowlist', () => {
      beforeEach(async () => {
        await service.handleMessage(
          buildMessage({ vin: 'VIN1', createdAt: 'c', alerts: [{ name: 'SOME_DIAGNOSTIC_CODE', audiences: ['service'], endedAt: null }] }),
          commit
        );
      });

      it('should not dispatch any alert', () => {
        expect(alertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When the allowlisted alert is already ended', () => {
      beforeEach(async () => {
        await service.handleMessage(
          buildMessage({ vin: 'VIN1', createdAt: 'c', alerts: [{ ...alarmAlert, endedAt: '2026-01-01T00:00:00Z' }] }),
          commit
        );
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
