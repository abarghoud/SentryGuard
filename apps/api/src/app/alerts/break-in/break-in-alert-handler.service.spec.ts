import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { BreakInAlertHandlerService } from './break-in-alert-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';

describe('The BreakInAlertHandlerService class', () => {
  let service: BreakInAlertHandlerService;

  let mockTelegramService: MockProxy<TelegramService>;
  let mockKeyboardBuilder: MockProxy<TelegramKeyboardBuilderService>;
  let mockAlertNotifier: MockProxy<VehicleAlertNotifierService>;

  beforeEach(async () => {
    mockTelegramService = mock<TelegramService>();
    mockKeyboardBuilder = mock<TelegramKeyboardBuilderService>();
    mockAlertNotifier = mock<VehicleAlertNotifierService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakInAlertHandlerService,
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilder },
        { provide: VehicleAlertNotifierService, useValue: mockAlertNotifier },
      ],
    }).compile();

    service = module.get<BreakInAlertHandlerService>(BreakInAlertHandlerService);
  });

  describe('The handle() method', () => {
    describe('When message does not contain CenterDisplay data', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(false);
      });

      it('should not dispatch alert', async () => {
        await service.handle(message);
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When displayState is not DisplayStateLock', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'isCenterDisplayLocked').mockReturnValue(false);
      });

      it('should not dispatch alert', async () => {
        await service.handle(message);
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When displayState is DisplayStateLock', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'isCenterDisplayLocked').mockReturnValue(true);
      });

      it('should dispatch alert via alertNotifier', async () => {
        await service.handle(message);
        
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(expect.objectContaining({
          telemetryMessage: message,
          alertName: 'BREAK_IN_ALERT',
          latencyLabel: 'BREAK_IN_LATENCY',
          telegramNotifier: expect.any(Function),
        }));
      });

      it('should construct and send telegram message when notifier callback is invoked', async () => {
        await service.handle(message);

        const dispatchCall = mockAlertNotifier.dispatch.mock.calls[0][0];
        const notifierCb = dispatchCall.telegramNotifier;

        mockKeyboardBuilder.buildBreakInAlertKeyboard.mockReturnValue({ inline_keyboard: [] });

        await notifierCb('user-1', { vin: '123', display_name: 'Test Vehicle' }, 'en');

        expect(mockKeyboardBuilder.buildBreakInAlertKeyboard).toHaveBeenCalledWith('user-1', 'en');
        expect(mockTelegramService.sendBreakInAlert).toHaveBeenCalledWith(
          'user-1',
          { vin: '123', display_name: 'Test Vehicle' },
          'en',
          { inline_keyboard: [] }
        );
      });
    });
  });
});
