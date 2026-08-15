import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { mock, MockProxy } from 'jest-mock-extended';
import { SentryAlertHandlerService } from './sentry-alert-handler.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';

import { TelemetryMessage, SentryModeState } from '../../telemetry/models/telemetry-message.model';

describe('The SentryAlertHandlerService class', () => {
  let service: SentryAlertHandlerService;

  let mockAlertNotifier: MockProxy<VehicleAlertNotifierService>;
  beforeEach(async () => {
    mockAlertNotifier = mock<VehicleAlertNotifierService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryAlertHandlerService,
        { provide: VehicleAlertNotifierService, useValue: mockAlertNotifier },
      ]
    }).compile();

    service = module.get<SentryAlertHandlerService>(SentryAlertHandlerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The handle method', () => {
    describe('when message does not contain valid SentryMode', () => {
      it('should skip message without SentryMode', async () => {
        const invalidMessage = plainToInstance(TelemetryMessage, {
          data: [{ key: 'OtherField', value: { stringValue: 'value' } }],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });

        await service.handle(invalidMessage);

        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });

      it('should skip message with null SentryMode value', async () => {
        const invalidMessage = plainToInstance(TelemetryMessage, {
          data: [{ key: 'SentryMode', value: { sentryModeStateValue: null } }],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });

        await service.handle(invalidMessage);

        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });

      it('should skip message with invalid sentryModeStateValue', async () => {
        const invalidMessage = plainToInstance(TelemetryMessage, {
          data: [{ key: 'SentryMode', value: { sentryModeStateValue: 'InvalidState' } }],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });

        await service.handle(invalidMessage);

        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('when SentryMode is not Aware', () => {
      it('should not dispatch alert', async () => {
        const message = plainToInstance(TelemetryMessage, {
          data: [
            {
              key: 'SentryMode',
              value: { sentryModeStateValue: SentryModeState.Off }
            }
          ],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });

        await service.handle(message);

        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('when SentryMode is Aware', () => {
      let baseTelemetryMessage: TelemetryMessage;

      beforeEach(() => {
        baseTelemetryMessage = plainToInstance(TelemetryMessage, {
          data: [
            {
              key: 'SentryMode',
              value: { sentryModeStateValue: 'SentryModeStateAware' }
            }
          ],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });
        mockAlertNotifier.dispatch.mockResolvedValue({ userIds: ['user-1'] });
      });

      it('should dispatch alert via alertNotifier', async () => {
        await service.handle(baseTelemetryMessage);

        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(expect.objectContaining({
          telemetryMessage: baseTelemetryMessage,
          alertName: 'SENTRY_ALERT',
          latencyLabel: 'SENTRY_LATENCY',
        }));
      });
    });
  });
});
