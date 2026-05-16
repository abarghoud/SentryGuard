import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { BreakInAlertHandlerService } from './break-in-alert-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertsOffensiveResponseService } from '../../offensive-response/alerts-offensive-response.service';
import { TelemetryMessage, TelemetryDatum } from '../../telemetry/models/telemetry-message.model';
import { ChargePortLatchTrackerService } from './charge-port-latch-tracker.service';

describe('The BreakInAlertHandlerService class', () => {
  let service: BreakInAlertHandlerService;

  let mockTelegramService: MockProxy<TelegramService>;
  let mockKeyboardBuilder: MockProxy<TelegramKeyboardBuilderService>;
  let mockAlertNotifier: MockProxy<VehicleAlertNotifierService>;
  let mockChargeTracker: MockProxy<ChargePortLatchTrackerService>;
  let mockOffensiveResponseService: MockProxy<AlertsOffensiveResponseService>;

  beforeEach(async () => {
    mockTelegramService = mock<TelegramService>();
    mockKeyboardBuilder = mock<TelegramKeyboardBuilderService>();
    mockAlertNotifier = mock<VehicleAlertNotifierService>();
    mockChargeTracker = mock<ChargePortLatchTrackerService>();
    mockOffensiveResponseService = mock<AlertsOffensiveResponseService>();
    mockOffensiveResponseService.handleBreakInOffensiveResponse.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakInAlertHandlerService,
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilder },
        { provide: VehicleAlertNotifierService, useValue: mockAlertNotifier },
        { provide: ChargePortLatchTrackerService, useValue: mockChargeTracker },
        { provide: AlertsOffensiveResponseService, useValue: mockOffensiveResponseService },
      ],
    }).compile();

    service = module.get<BreakInAlertHandlerService>(BreakInAlertHandlerService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('The handle() method', () => {
    describe('When message contains a ChargePortLatch event', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        message.createdAt = new Date('2026-05-05T20:00:00Z').toISOString();
        message.data = [{ key: 'ChargePortLatch' } as TelemetryDatum];
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(false);
      });

      it('should track the latch event in the charge tracker', async () => {
        await service.handle(message);
        const expectedTime = new Date(message.createdAt).getTime();
        expect(mockChargeTracker.trackLatchEvent).toHaveBeenCalledWith('123', expectedTime);
      });
    });

    describe('When message does not contain CenterDisplay data', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        message.createdAt = new Date('2026-05-05T20:00:00Z').toISOString();
        message.data = [];
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(false);
      });

      it('should not dispatch alert', async () => {
        await service.handle(message);
        jest.runAllTimers();
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When displayState is not DisplayStateLock', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        message.createdAt = new Date('2026-05-05T20:00:00Z').toISOString();
        message.data = [];
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'isCenterDisplayLocked').mockReturnValue(false);
      });

      it('should not dispatch alert', async () => {
        await service.handle(message);
        jest.runAllTimers();
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When displayState is DisplayStateLock and a recent latch event occurred', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        message.createdAt = new Date('2026-05-05T20:00:00Z').toISOString();
        message.data = [];
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'isCenterDisplayLocked').mockReturnValue(true);
        mockChargeTracker.hasLatchEventAround.mockReturnValue(true);
      });

      it('should delay the verification by 3 seconds to ensure subsequent ChargePortLatch events have time to arrive, then prevent alert dispatch', async () => {
        await service.handle(message);
        jest.advanceTimersByTime(3000);

        await Promise.resolve();

        expect(mockChargeTracker.hasLatchEventAround).toHaveBeenCalled();
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When displayState is DisplayStateLock and no recent latch event occurred', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        message.createdAt = new Date('2026-05-05T20:00:00Z').toISOString();
        message.data = [];
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'isCenterDisplayLocked').mockReturnValue(true);
        mockChargeTracker.hasLatchEventAround.mockReturnValue(false);
      });

      it('should delay the verification by 3 seconds to account for telemetry lag, then dispatch the alert via alertNotifier', async () => {
        await service.handle(message);
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();

        jest.advanceTimersByTime(3000);

        await Promise.resolve();

        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(expect.objectContaining({
          telemetryMessage: message,
          alertName: 'BREAK_IN_ALERT',
          latencyLabel: 'BREAK_IN_LATENCY',
          telegramNotifier: expect.any(Function),
        }));
      });

      it('should trigger offensive response for the VIN', async () => {
        await service.handle(message);
        jest.advanceTimersByTime(3000);
        await Promise.resolve();

        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledWith('123');
      });

      it('should construct and send telegram message when notifier callback is invoked', async () => {
        await service.handle(message);
        jest.advanceTimersByTime(3000);
        await Promise.resolve();

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
