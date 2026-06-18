import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { mock, MockProxy } from 'jest-mock-extended';

import { SentryAlertHandlerService } from './sentry-alert-handler.service';
import { SentryPresenceTrackerService } from './sentry-presence-tracker.service';
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
  let mockPresenceTracker: MockProxy<SentryPresenceTrackerService>;

  beforeEach(async () => {
    mockTelegramService = mock<TelegramService>();
    mockKeyboardBuilder = mock<TelegramKeyboardBuilderService>();
    mockAlertNotifier = mock<VehicleAlertNotifierService>();
    mockPresenceTracker = mock<SentryPresenceTrackerService>();
    mockAlertNotifier.dispatch.mockResolvedValue({ userIds: ['user-1'] });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryAlertHandlerService,
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilder },
        { provide: VehicleAlertNotifierService, useValue: mockAlertNotifier },
        { provide: SentryPresenceTrackerService, useValue: mockPresenceTracker },
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
          })
        );
      });

      it('should also start watching for sustained presence', () => {
        expect(mockPresenceTracker.watch).toHaveBeenCalledWith('TEST_VIN_123', expect.any(Function));
      });
    });

    describe('When the sustained-presence watch fires (not final)', () => {
      beforeEach(async () => {
        await service.handle(buildMessage(SentryModeState.Aware));
        const onSustained = mockPresenceTracker.watch.mock.calls[0][1];
        await onSustained(false);
      });

      it('should dispatch a critical sustained-presence alert', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            alertName: 'SENTRY_SUSTAINED_PRESENCE',
            severity: AlertEventSeverity.Critical,
            type: AlertEventType.SustainedPresence,
          })
        );
      });
    });

    describe('When the final sustained-presence watch fires', () => {
      beforeEach(async () => {
        await service.handle(buildMessage(SentryModeState.Aware));
        const onSustained = mockPresenceTracker.watch.mock.calls[0][1];
        await onSustained(true);
      });

      it('should dispatch the final sustained-presence alert', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            alertName: 'SENTRY_SUSTAINED_PRESENCE_FINAL',
            severity: AlertEventSeverity.Critical,
            type: AlertEventType.SustainedPresenceFinal,
          })
        );
      });
    });

    describe('When SentryMode is Panic', () => {
      beforeEach(async () => {
        await service.handle(buildMessage(SentryModeState.Panic));
      });

      it('should clear the presence watch', () => {
        expect(mockPresenceTracker.clear).toHaveBeenCalledWith('TEST_VIN_123');
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

      it('should clear the presence watch', () => {
        expect(mockPresenceTracker.clear).toHaveBeenCalledWith('TEST_VIN_123');
      });

      it('should not dispatch any alert', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });
  });
});
