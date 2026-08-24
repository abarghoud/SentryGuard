import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { BreakInAlertHandlerService } from './break-in-alert-handler.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertsOffensiveResponseService } from '../../offensive-response/alerts-offensive-response.service';
import { AlertsAutoSentryService } from '../../offensive-response/alerts-auto-sentry.service';
import { TelemetryMessage, TelemetryDatum, TelemetryValue } from '../../telemetry/models/telemetry-message.model';
import { BreakInEventTrackerService, BreakInTrackedEvent } from './break-in-event-tracker.service';

describe('The BreakInAlertHandlerService class', () => {
  let service: BreakInAlertHandlerService;

  let mockAlertNotifier: MockProxy<VehicleAlertNotifierService>;
  let mockEventTracker: MockProxy<BreakInEventTrackerService>;
  let mockOffensiveResponseService: MockProxy<AlertsOffensiveResponseService>;
  let mockAutoSentryService: MockProxy<AlertsAutoSentryService>;

  beforeEach(async () => {
    mockAlertNotifier = mock<VehicleAlertNotifierService>();
    mockEventTracker = mock<BreakInEventTrackerService>();
    mockOffensiveResponseService = mock<AlertsOffensiveResponseService>();
    mockOffensiveResponseService.handleBreakInOffensiveResponse.mockResolvedValue(undefined);
    mockAutoSentryService = mock<AlertsAutoSentryService>();
    mockAutoSentryService.handleBreakInAutoSentry.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakInAlertHandlerService,
        { provide: VehicleAlertNotifierService, useValue: mockAlertNotifier },
        { provide: BreakInEventTrackerService, useValue: mockEventTracker },
        { provide: AlertsOffensiveResponseService, useValue: mockOffensiveResponseService },
        { provide: AlertsAutoSentryService, useValue: mockAutoSentryService },
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

        const datum = new TelemetryDatum();
        datum.key = 'ChargePortLatch';
        datum.value = new TelemetryValue();
        datum.value.chargePortLatchValue = 'ChargePortLatchDisengaged';
        message.data = [datum];

        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(false);
      });

      it('should track the latch event in the break-in event tracker', async () => {
        await service.handle(message);
        const expectedTime = new Date(message.createdAt).getTime();
        expect(mockEventTracker.track).toHaveBeenCalledWith('123', BreakInTrackedEvent.ChargePortLatchDisengaged, expectedTime);
      });
    });

    describe('When message contains CenterDisplay owner activity', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        message.createdAt = new Date('2026-05-05T20:00:00Z').toISOString();

        const datum = new TelemetryDatum();
        datum.key = 'CenterDisplay';
        datum.value = new TelemetryValue();
        datum.value.displayStateValue = 'DisplayStateAccessory';
        message.data = [datum];

        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(false);
      });

      it('should track the owner activity event in the break-in event tracker', async () => {
        await service.handle(message);
        const expectedTime = new Date(message.createdAt).getTime();
        expect(mockEventTracker.track).toHaveBeenCalledWith('123', BreakInTrackedEvent.CenterDisplayOwnerActivity, expectedTime);
      });
    });

    describe('When message contains CenterDisplay Off state', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        message.createdAt = new Date('2026-05-05T20:00:00Z').toISOString();

        const datum = new TelemetryDatum();
        datum.key = 'CenterDisplay';
        datum.value = new TelemetryValue();
        datum.value.displayStateValue = 'DisplayStateOff';
        message.data = [datum];

        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(false);
      });

      it('should not track owner activity in the break-in event tracker', async () => {
        await service.handle(message);
        expect(mockEventTracker.track).not.toHaveBeenCalled();
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
        mockEventTracker.hasEventAround.mockReturnValue(true);
      });

      it('should delay the verification by 3 seconds to ensure subsequent ChargePortLatch events have time to arrive, then prevent alert dispatch', async () => {
        await service.handle(message);
        jest.advanceTimersByTime(3000);

        await Promise.resolve();

        expect(mockEventTracker.hasEventAround).toHaveBeenCalled();
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When displayState is DisplayStateLock and owner activity occurred within the grace period', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        message.createdAt = new Date('2026-05-05T20:00:00Z').toISOString();
        message.data = [];
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'isCenterDisplayLocked').mockReturnValue(true);
        mockEventTracker.hasEventAfter.mockImplementation((_vin, event) =>
          event === BreakInTrackedEvent.CenterDisplayOwnerActivity
        );
      });

      it('should suppress the alert, the offensive response and the auto sentry', async () => {
        await service.handle(message);
        await jest.advanceTimersByTimeAsync(3000);

        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
        expect(mockAutoSentryService.handleBreakInAutoSentry).not.toHaveBeenCalled();
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
        mockEventTracker.hasEventAround.mockReturnValue(false);
        mockAlertNotifier.dispatch.mockResolvedValue({ userIds: ['user-1'] });
      });

      it('should delay the verification by 3 seconds to account for telemetry lag, then dispatch the alert via alertNotifier', async () => {
        await service.handle(message);
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(3000);

        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(expect.objectContaining({
          telemetryMessage: message,
          alertName: 'BREAK_IN_ALERT',
          latencyLabel: 'BREAK_IN_LATENCY',
        }));
      });

      it('should respect a custom delay specified via environment variable', async () => {
        process.env.BREAK_IN_ALERT_CHECK_DELAY_MS = '1500';
        try {
          await service.handle(message);
          await jest.advanceTimersByTimeAsync(1400);
          expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();

          await jest.advanceTimersByTimeAsync(100);
          expect(mockAlertNotifier.dispatch).toHaveBeenCalled();
        } finally {
          delete process.env.BREAK_IN_ALERT_CHECK_DELAY_MS;
        }
      });

      it('should trigger offensive response for the VIN with userIds', async () => {
        await service.handle(message);
        await jest.advanceTimersByTimeAsync(3000);

        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledWith('123', ['user-1'], message.createdAt);
      });

      it('should trigger auto sentry for the VIN with userIds', async () => {
        await service.handle(message);
        await jest.advanceTimersByTimeAsync(3000);

        expect(mockAutoSentryService.handleBreakInAutoSentry).toHaveBeenCalledWith('123', ['user-1'], message.createdAt);
      });
    });
  });

  describe('The flushPendingVerifications() method', () => {
    const createLockedDisplayMessage = (): TelemetryMessage => {
      const message = new TelemetryMessage();
      message.vin = '123';
      message.createdAt = new Date('2026-05-05T20:00:00Z').toISOString();
      message.data = [];
      jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
      jest.spyOn(message, 'isCenterDisplayLocked').mockReturnValue(true);
      return message;
    };

    describe('When there are no pending verifications', () => {
      it('should resolve immediately', async () => {
        await expect(service.flushPendingVerifications(1000)).resolves.toBeUndefined();
      });
    });

    describe('When there is a pending verification', () => {
      it('should wait for the verification to dispatch before resolving', async () => {
        mockEventTracker.hasEventAround.mockReturnValue(false);
        mockAlertNotifier.dispatch.mockResolvedValue({ userIds: ['user-1'] });

        await service.handle(createLockedDisplayMessage());

        const flushPromise = service.flushPendingVerifications(6000);
        jest.advanceTimersByTime(3000);

        await expect(flushPromise).resolves.toBeUndefined();
        expect(mockAlertNotifier.dispatch).toHaveBeenCalled();
      });

      it('should resolve after the timeout when verifications are still pending', async () => {
        await service.handle(createLockedDisplayMessage());

        const flushPromise = service.flushPendingVerifications(1000);
        jest.advanceTimersByTime(1000);

        await expect(flushPromise).resolves.toBeUndefined();
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });
  });
});
