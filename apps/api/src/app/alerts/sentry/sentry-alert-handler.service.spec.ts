import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { mock, MockProxy } from 'jest-mock-extended';
import { SentryAlertHandlerService } from './sentry-alert-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { OffensiveResponseService } from '../services/offensive-response.service';
import { TelemetryMessage, SentryModeState } from '../../telemetry/models/telemetry-message.model';

describe('The SentryAlertHandlerService class', () => {
  let service: SentryAlertHandlerService;

  let mockTelegramService: MockProxy<TelegramService>;
  let mockKeyboardBuilder: MockProxy<TelegramKeyboardBuilderService>;
  let mockAlertNotifier: MockProxy<VehicleAlertNotifierService>;
  let mockOffensiveResponseService: MockProxy<OffensiveResponseService>;

  beforeEach(async () => {
    mockTelegramService = mock<TelegramService>();
    mockKeyboardBuilder = mock<TelegramKeyboardBuilderService>();
    mockAlertNotifier = mock<VehicleAlertNotifierService>();
    mockOffensiveResponseService = mock<OffensiveResponseService>();
    mockOffensiveResponseService.handleOffensiveResponse.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryAlertHandlerService,
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilder },
        { provide: VehicleAlertNotifierService, useValue: mockAlertNotifier },
        { provide: OffensiveResponseService, useValue: mockOffensiveResponseService },
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
      });

      it('should dispatch alert via alertNotifier', async () => {
        await service.handle(baseTelemetryMessage);

        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(expect.objectContaining({
          telemetryMessage: baseTelemetryMessage,
          alertName: 'SENTRY_ALERT',
          latencyLabel: 'SENTRY_LATENCY',
          telegramNotifier: expect.any(Function)
        }));
      });

      it('should trigger offensive response for the VIN', async () => {
        await service.handle(baseTelemetryMessage);

        expect(mockOffensiveResponseService.handleOffensiveResponse).toHaveBeenCalledWith('TEST_VIN_123');
      });

      it('should construct and send telegram message when notifier callback is invoked', async () => {
        await service.handle(baseTelemetryMessage);

        const dispatchCall = mockAlertNotifier.dispatch.mock.calls[0][0];
        const notifierCb = dispatchCall.telegramNotifier;

        mockKeyboardBuilder.buildSentryAlertKeyboard.mockReturnValue({
          inline_keyboard: [[{ text: 'Test Button', url: 'http://test.com' }]]
        });

        await notifierCb('test-user', { vin: '123', display_name: 'Test Vehicle' }, 'en');

        expect(mockKeyboardBuilder.buildSentryAlertKeyboard).toHaveBeenCalledWith('test-user', 'en');
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith(
          'test-user',
          { vin: '123', display_name: 'Test Vehicle' },
          'en',
          { inline_keyboard: [[{ text: 'Test Button', url: 'http://test.com' }]] }
        );
      });
    });
  });
});
