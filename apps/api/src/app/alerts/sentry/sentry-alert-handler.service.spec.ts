import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { mock, MockProxy } from 'jest-mock-extended';

import { SentryAlertHandlerService } from './sentry-alert-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';
import { SentryModeState, TelemetryMessage } from '../../telemetry/models/telemetry-message.model';

const buildMessage = (state: string): TelemetryMessage =>
  plainToInstance(TelemetryMessage, {
    data: [{ key: 'SentryMode', value: { sentryModeStateValue: state } }],
    createdAt: '2025-01-21T10:00:00.000Z',
    vin: 'TEST_VIN_123',
    isResend: false,
  });

describe('The SentryAlertHandlerService class', () => {
  let service: SentryAlertHandlerService;
  let mockTelegramService: MockProxy<TelegramService>;
  let mockKeyboardBuilder: MockProxy<TelegramKeyboardBuilderService>;
  let mockAlertNotifier: MockProxy<VehicleAlertNotifierService>;

  beforeEach(async () => {
    mockTelegramService = mock<TelegramService>();
    mockKeyboardBuilder = mock<TelegramKeyboardBuilderService>();
    mockAlertNotifier = mock<VehicleAlertNotifierService>();
    mockAlertNotifier.dispatch.mockResolvedValue({ userIds: ['user-1'] });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryAlertHandlerService,
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilder },
        { provide: VehicleAlertNotifierService, useValue: mockAlertNotifier },
      ],
    }).compile();

    service = module.get<SentryAlertHandlerService>(SentryAlertHandlerService);
    jest.clearAllMocks();
  });

  describe('The handle() method', () => {
    describe('When the message has no valid SentryMode', () => {
      it('should not dispatch any alert', async () => {
        const message = plainToInstance(TelemetryMessage, {
          data: [{ key: 'OtherField', value: { stringValue: 'value' } }],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false,
        });

        await service.handle(message);

        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When SentryMode is Aware', () => {
      beforeEach(async () => {
        await service.handle(buildMessage(SentryModeState.Aware));
      });

      it('should dispatch the immediate Sentry alert', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            alertName: 'SENTRY_ALERT',
            severity: AlertEventSeverity.Warning,
            type: AlertEventType.Sentry,
          })
        );
      });
    });

    describe('When SentryMode is Panic', () => {
      beforeEach(async () => {
        await service.handle(buildMessage(SentryModeState.Panic));
      });

      it('should dispatch a critical panic alert', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            alertName: 'SENTRY_PANIC',
            severity: AlertEventSeverity.Critical,
            type: AlertEventType.Panic,
          })
        );
      });
    });

    describe('When SentryMode is Armed (neither Aware nor Panic)', () => {
      beforeEach(async () => {
        await service.handle(buildMessage(SentryModeState.Armed));
      });

      it('should not dispatch any alert', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });
  });
});
