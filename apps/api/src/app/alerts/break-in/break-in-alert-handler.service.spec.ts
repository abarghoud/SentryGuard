import { mock, MockProxy } from 'jest-mock-extended';

import { BreakInAlertHandlerService } from './break-in-alert-handler.service';
import { BreakInEventTrackerService } from './break-in-event-tracker.service';
import {
  BreakInDetectionGroup,
  BreakInDetectionVehicle,
  VehicleBreakInDetectionSettingsService,
} from './vehicle-break-in-detection-settings.service';
import { CounterMeasureNotifierService } from './counter-measure-notifier.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertsOffensiveResponseService } from '../../offensive-response/alerts-offensive-response.service';
import { AlertsAutoSentryService } from '../../offensive-response/alerts-auto-sentry.service';
import { SentryModeStateTrackerService } from '../../offensive-response/sentry-mode-state-tracker.service';
import { TelemetryDatum, TelemetryMessage, TelemetryValue } from '../../telemetry/models/telemetry-message.model';
import { BreakInSensitivity } from '../enums/break-in-sensitivity.enum';
import { CounterMeasure } from '../enums/counter-measure.enum';
import { OffensiveResponse } from '../enums/offensive-response.enum';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

describe('The BreakInAlertHandlerService class', () => {
  const fakeVin = 'XP7YGCER1TB919128';
  const fakeLockTime = new Date('2026-10-16T12:00:00Z').getTime();
  const fakeVehicle: BreakInDetectionVehicle = {
    break_in_auto_sentry_mode_enabled: true,
    break_in_offensive_response: OffensiveResponse.HONK,
    display_name: 'My Tesla',
    userId: 'user-1',
    vin: fakeVin,
  };
  const otherOwnerVehicle: BreakInDetectionVehicle = { ...fakeVehicle, display_name: 'Our Tesla', userId: 'user-2' };
  const defaultGroup: BreakInDetectionGroup = {
    hasCounterMeasures: true,
    reactionDelaySeconds: 5,
    sensitivity: BreakInSensitivity.SinglePull,
    vehicles: [fakeVehicle],
  };
  const repeatedPullsGroup: BreakInDetectionGroup = {
    hasCounterMeasures: true,
    reactionDelaySeconds: 20,
    sensitivity: BreakInSensitivity.RepeatedPulls,
    vehicles: [fakeVehicle],
  };

  let service: BreakInAlertHandlerService;
  let mockAlertNotifier: MockProxy<VehicleAlertNotifierService>;
  let mockOffensiveResponseService: MockProxy<AlertsOffensiveResponseService>;
  let mockAutoSentryService: MockProxy<AlertsAutoSentryService>;
  let mockDetectionSettingsService: MockProxy<VehicleBreakInDetectionSettingsService>;
  let mockCounterMeasureNotifier: MockProxy<CounterMeasureNotifierService>;
  let mockSentryModeStateTracker: MockProxy<SentryModeStateTrackerService>;

  const buildMessage = (key: string, value: Partial<TelemetryValue>, offsetMs: number): TelemetryMessage => {
    const message = new TelemetryMessage();
    const datum = new TelemetryDatum();
    datum.key = key;
    datum.value = Object.assign(new TelemetryValue(), value);
    message.vin = fakeVin;
    message.correlationId = `correlation-${key}-${offsetMs}`;
    message.createdAt = new Date(fakeLockTime + offsetMs).toISOString();
    message.data = [datum];
    return message;
  };

  const buildDisplayMessage = (displayStateValue: string, offsetMs = 0): TelemetryMessage =>
    buildMessage('CenterDisplay', { displayStateValue }, offsetMs);

  const buildLatchMessage = (offsetMs: number): TelemetryMessage =>
    buildMessage('ChargePortLatch', { chargePortLatchValue: 'ChargePortLatchDisengaged' }, offsetMs);

  const handleSequence = async (steps: Array<{ message: TelemetryMessage; waitMs: number }>): Promise<void> => {
    for (const step of steps) {
      await service.handle(step.message);
      await jest.advanceTimersByTimeAsync(step.waitMs);
    }
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockAlertNotifier = mock<VehicleAlertNotifierService>();
    mockAlertNotifier.dispatch.mockResolvedValue({ userIds: ['user-1'] });
    mockOffensiveResponseService = mock<AlertsOffensiveResponseService>();
    mockOffensiveResponseService.handleBreakInOffensiveResponse.mockResolvedValue(OffensiveResponse.HONK);
    mockAutoSentryService = mock<AlertsAutoSentryService>();
    mockAutoSentryService.handleBreakInAutoSentry.mockResolvedValue({ isSentryModeActivated: true });
    mockDetectionSettingsService = mock<VehicleBreakInDetectionSettingsService>();
    mockDetectionSettingsService.findGroupsByVin.mockResolvedValue([defaultGroup]);
    mockCounterMeasureNotifier = mock<CounterMeasureNotifierService>();
    mockSentryModeStateTracker = mock<SentryModeStateTrackerService>();
    mockSentryModeStateTracker.isSentryModeActiveAt.mockReturnValue(false);
    mockSentryModeStateTracker.wasSentryModeActiveAt.mockReturnValue(false);

    service = new BreakInAlertHandlerService(
      mockAlertNotifier,
      new BreakInEventTrackerService(),
      mockOffensiveResponseService,
      mockAutoSentryService,
      mockDetectionSettingsService,
      mockCounterMeasureNotifier,
      mockSentryModeStateTracker
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('The handle() method', () => {
    describe('When the message does not lock the center display', () => {
      beforeEach(async () => {
        await handleSequence([{ message: buildDisplayMessage('DisplayStateOff'), waitMs: 60_000 }]);
      });

      it('should not read the detection settings', () => {
        expect(mockDetectionSettingsService.findGroupsByVin).not.toHaveBeenCalled();
      });

      it('should not dispatch any alert', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When no vehicle is registered for the VIN', () => {
      beforeEach(async () => {
        mockDetectionSettingsService.findGroupsByVin.mockResolvedValue([]);
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 60_000 }]);
      });

      it('should not dispatch any alert', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When the display locks while Sentry Mode is on', () => {
      let lockMessage: TelemetryMessage;

      beforeEach(async () => {
        mockSentryModeStateTracker.isSentryModeActiveAt.mockReturnValue(true);
        lockMessage = buildDisplayMessage('DisplayStateLock');
        await handleSequence([{ message: lockMessage, waitMs: 60_000 }]);
      });

      it('should check the Sentry Mode state of the lock message', () => {
        expect(mockSentryModeStateTracker.isSentryModeActiveAt).toHaveBeenCalledWith(lockMessage);
      });

      it('should not notify the owners', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });

      it('should not trigger the offensive response', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
      });

      it('should not trigger the auto sentry', () => {
        expect(mockAutoSentryService.handleBreakInAutoSentry).not.toHaveBeenCalled();
      });
    });

    describe('When an ignored lock carries a charge port latch release', () => {
      beforeEach(async () => {
        const ignoredLockMessage = buildDisplayMessage('DisplayStateLock');
        ignoredLockMessage.data = [...ignoredLockMessage.data, ...buildLatchMessage(0).data];
        mockSentryModeStateTracker.isSentryModeActiveAt.mockImplementation((message: TelemetryMessage) => message === ignoredLockMessage);
        await handleSequence([
          { message: ignoredLockMessage, waitMs: 3_000 },
          { message: buildDisplayMessage('DisplayStateLock', 3_000), waitMs: 60_000 },
        ]);
      });

      it('should still use the latch release to suppress the next lock', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When the detection settings cannot be read', () => {
      let act: () => Promise<void>;

      beforeEach(() => {
        mockDetectionSettingsService.findGroupsByVin.mockRejectedValue(new Error('Database unavailable'));
        act = async () => await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 60_000 }]);
      });

      it('should not fail the telemetry message', async () => {
        await expect(act()).resolves.toBeUndefined();
      });

      it('should not dispatch any alert', async () => {
        await act();

        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When the alert dispatch fails', () => {
      beforeEach(async () => {
        mockAlertNotifier.dispatch.mockRejectedValue(new Error('Database unavailable'));
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 }]);
      });

      it('should still trigger the offensive response', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledTimes(1);
      });

      it('should not leave the verification pending', async () => {
        await expect(service.flushPendingVerifications(0)).resolves.toBeUndefined();
      });
    });

    describe('When a single pull locks the display with the default settings', () => {
      let lockMessage: TelemetryMessage;

      beforeEach(async () => {
        lockMessage = buildDisplayMessage('DisplayStateLock');
        await handleSequence([{ message: lockMessage, waitMs: 5_000 }]);
      });

      it('should notify every owner of the VIN with a critical break-in alert', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith({
          alertName: 'BREAK_IN_ALERT',
          latencyLabel: 'BREAK_IN_LATENCY',
          reactionDelayMs: 5_000,
          severity: AlertEventSeverity.Critical,
          telemetryMessage: lockMessage,
          type: AlertEventType.BreakIn,
        });
      });

      it('should trigger the offensive response with the reaction delay', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledWith(
          fakeVin,
          [fakeVehicle],
          new Date(fakeLockTime).toISOString(),
          5_000
        );
      });

      it('should trigger the auto sentry with the reaction delay', () => {
        expect(mockAutoSentryService.handleBreakInAutoSentry).toHaveBeenCalledWith(
          fakeVin,
          [fakeVehicle],
          new Date(fakeLockTime).toISOString(),
          5_000
        );
      });
    });

    describe('When the counter-measures went off', () => {
      beforeEach(async () => {
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 }]);
      });

      it('should tell the owners which counter-measures went off', () => {
        expect(mockCounterMeasureNotifier.notify).toHaveBeenCalledWith(
          fakeVin,
          [fakeVehicle],
          [CounterMeasure.Honk, CounterMeasure.AutoSentry],
          'correlation-CenterDisplay-0'
        );
      });
    });

    describe('When only the fart sound went off', () => {
      beforeEach(async () => {
        mockOffensiveResponseService.handleBreakInOffensiveResponse.mockResolvedValue(OffensiveResponse.FART);
        mockAutoSentryService.handleBreakInAutoSentry.mockResolvedValue({ isSentryModeActivated: false });
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 }]);
      });

      it('should only mention the fart sound', () => {
        expect(mockCounterMeasureNotifier.notify).toHaveBeenCalledWith(fakeVin, [fakeVehicle], [CounterMeasure.Fart], 'correlation-CenterDisplay-0');
      });
    });

    describe('When no counter-measure went off', () => {
      beforeEach(async () => {
        mockOffensiveResponseService.handleBreakInOffensiveResponse.mockResolvedValue(null);
        mockAutoSentryService.handleBreakInAutoSentry.mockResolvedValue({ isSentryModeActivated: false });
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 }]);
      });

      it('should not send a counter-measure notice', () => {
        expect(mockCounterMeasureNotifier.notify).not.toHaveBeenCalled();
      });
    });

    describe('When a counter-measure fails', () => {
      beforeEach(async () => {
        mockOffensiveResponseService.handleBreakInOffensiveResponse.mockRejectedValue(new Error('Proxy unreachable'));
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 }]);
      });

      it('should only mention the counter-measures that went off', () => {
        expect(mockCounterMeasureNotifier.notify).toHaveBeenCalledWith(fakeVin, [fakeVehicle], [CounterMeasure.AutoSentry], 'correlation-CenterDisplay-0');
      });
    });

    describe('When the notification delay has not elapsed yet', () => {
      beforeEach(async () => {
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 4_000 }]);
      });

      it('should not dispatch the alert', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('When the key is recognised within the notification delay', () => {
      beforeEach(async () => {
        await handleSequence([
          { message: buildDisplayMessage('DisplayStateLock'), waitMs: 2_000 },
          { message: buildDisplayMessage('DisplayStateAccessory', 2_000), waitMs: 60_000 },
        ]);
      });

      it('should not notify the owners', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });

      it('should not trigger the offensive response', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
      });
    });

    describe('When a vehicle uses a reaction delay shorter than the notification delay', () => {
      beforeEach(async () => {
        mockDetectionSettingsService.findGroupsByVin.mockResolvedValue([{ ...defaultGroup, reactionDelaySeconds: 3 }]);
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 3_000 }]);
      });

      it('should notify the owners no later than the counter-measures', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(expect.objectContaining({ reactionDelayMs: 3_000 }));
      });
    });

    describe('When the co-owner with a shorter reaction delay has no counter-measure enabled', () => {
      beforeEach(async () => {
        mockDetectionSettingsService.findGroupsByVin.mockResolvedValue([
          defaultGroup,
          { hasCounterMeasures: false, reactionDelaySeconds: 3, sensitivity: BreakInSensitivity.SinglePull, vehicles: [otherOwnerVehicle] },
        ]);
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 }]);
      });

      it('should keep the default notification delay', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledWith(expect.objectContaining({ reactionDelayMs: 5_000 }));
      });

      it('should only trigger the counter-measures of the co-owners who enabled them', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse.mock.calls).toStrictEqual([
          [fakeVin, [fakeVehicle], new Date(fakeLockTime).toISOString(), 5_000],
        ]);
      });
    });

    describe('When Sentry Mode turns out to have been on at the lock by the time the alert is due', () => {
      beforeEach(async () => {
        mockSentryModeStateTracker.wasSentryModeActiveAt.mockReturnValue(true);
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 }]);
      });

      it('should not notify the owners', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });

      it('should not trigger the offensive response', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
      });
    });

    describe('When the key is recognised after the notification but within the reaction delay', () => {
      beforeEach(async () => {
        mockDetectionSettingsService.findGroupsByVin.mockResolvedValue([{ ...defaultGroup, reactionDelaySeconds: 20 }]);
        await handleSequence([
          { message: buildDisplayMessage('DisplayStateLock'), waitMs: 15_000 },
          { message: buildDisplayMessage('DisplayStateAccessory', 15_000), waitMs: 10_000 },
        ]);
      });

      it('should still notify the owners', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledTimes(1);
      });

      it('should cancel the offensive response', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
      });

      it('should cancel the auto sentry', () => {
        expect(mockAutoSentryService.handleBreakInAutoSentry).not.toHaveBeenCalled();
      });

      it('should not send a counter-measure notice', () => {
        expect(mockCounterMeasureNotifier.notify).not.toHaveBeenCalled();
      });
    });

    describe('When the owner activity happened before the lock', () => {
      beforeEach(async () => {
        await handleSequence([
          { message: buildDisplayMessage('DisplayStateAccessory', -1_000), waitMs: 0 },
          { message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 },
        ]);
      });

      it('should still notify the owners', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledTimes(1);
      });

      it('should still trigger the offensive response', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the charge port latch is disengaged around the lock', () => {
      beforeEach(async () => {
        await handleSequence([
          { message: buildLatchMessage(-2_000), waitMs: 0 },
          { message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 },
        ]);
      });

      it('should suppress the alert', () => {
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });

      it('should suppress the offensive response', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
      });
    });

    describe('When the same lock message is replayed', () => {
      beforeEach(async () => {
        const lockMessage = buildDisplayMessage('DisplayStateLock');
        await handleSequence([
          { message: lockMessage, waitMs: 1_000 },
          { message: lockMessage, waitMs: 5_000 },
        ]);
      });

      it('should dispatch a single alert', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledTimes(1);
      });

      it('should trigger a single offensive response', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the counter-measures require repeated pulls', () => {
      beforeEach(() => {
        mockDetectionSettingsService.findGroupsByVin.mockResolvedValue([repeatedPullsGroup]);
      });

      describe('When the handle is pulled only once', () => {
        beforeEach(async () => {
          await handleSequence([
            { message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 },
            { message: buildDisplayMessage('DisplayStateOff', 5_000), waitMs: 60_000 },
          ]);
        });

        it('should still notify the owners', () => {
          expect(mockAlertNotifier.dispatch).toHaveBeenCalledTimes(1);
        });

        it('should not trigger the offensive response', () => {
          expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
        });

        it('should not trigger the auto sentry', () => {
          expect(mockAutoSentryService.handleBreakInAutoSentry).not.toHaveBeenCalled();
        });
      });

      describe('When the handle is pulled twice within a minute', () => {
        beforeEach(async () => {
          await handleSequence([
            { message: buildDisplayMessage('DisplayStateLock'), waitMs: 5_000 },
            { message: buildDisplayMessage('DisplayStateOff', 5_000), waitMs: 10_000 },
            { message: buildDisplayMessage('DisplayStateLock', 15_000), waitMs: 20_000 },
          ]);
        });

        it('should notify the owners for each pull', () => {
          expect(mockAlertNotifier.dispatch).toHaveBeenCalledTimes(2);
        });

        it('should trigger the offensive response once, after the reaction delay of the second pull', () => {
          expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledWith(
            fakeVin,
            [fakeVehicle],
            new Date(fakeLockTime + 15_000).toISOString(),
            20_000
          );
        });
      });

      describe('When the handle is pulled three times within a minute', () => {
        beforeEach(async () => {
          await handleSequence([
            { message: buildDisplayMessage('DisplayStateLock'), waitMs: 10_000 },
            { message: buildDisplayMessage('DisplayStateLock', 10_000), waitMs: 10_000 },
            { message: buildDisplayMessage('DisplayStateLock', 20_000), waitMs: 30_000 },
          ]);
        });

        it('should trigger the offensive response only once', () => {
          expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledTimes(1);
        });
      });

      describe('When the two pulls are more than a minute apart', () => {
        beforeEach(async () => {
          await handleSequence([
            { message: buildDisplayMessage('DisplayStateLock'), waitMs: 70_000 },
            { message: buildDisplayMessage('DisplayStateLock', 70_000), waitMs: 30_000 },
          ]);
        });

        it('should not trigger the offensive response', () => {
          expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
        });
      });

      describe('When the first pull happened while Sentry Mode was on', () => {
        beforeEach(async () => {
          const firstLockMessage = buildDisplayMessage('DisplayStateLock');
          mockSentryModeStateTracker.isSentryModeActiveAt.mockImplementation((message: TelemetryMessage) => message === firstLockMessage);
          await handleSequence([
            { message: firstLockMessage, waitMs: 10_000 },
            { message: buildDisplayMessage('DisplayStateOff', 10_000), waitMs: 5_000 },
            { message: buildDisplayMessage('DisplayStateLock', 15_000), waitMs: 30_000 },
          ]);
        });

        it('should not count it as a pull', () => {
          expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
        });

        it('should still notify the owners for the second pull', () => {
          expect(mockAlertNotifier.dispatch).toHaveBeenCalledTimes(1);
        });
      });

      describe('When the first lock came from the charge port', () => {
        beforeEach(async () => {
          await handleSequence([
            { message: buildDisplayMessage('DisplayStateLock'), waitMs: 1_000 },
            { message: buildLatchMessage(1_000), waitMs: 9_000 },
            { message: buildDisplayMessage('DisplayStateOff', 10_000), waitMs: 5_000 },
            { message: buildDisplayMessage('DisplayStateLock', 15_000), waitMs: 30_000 },
          ]);
        });

        it('should not count the charge port lock as a pull', () => {
          expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
        });

        it('should still notify the owners for the handle pull', () => {
          expect(mockAlertNotifier.dispatch).toHaveBeenCalledTimes(1);
        });
      });

      describe('When the handle is pulled twice after the owner got in and left', () => {
        beforeEach(async () => {
          await handleSequence([
            { message: buildDisplayMessage('DisplayStateLock'), waitMs: 10_000 },
            { message: buildDisplayMessage('DisplayStateAccessory', 10_000), waitMs: 20_000 },
            { message: buildDisplayMessage('DisplayStateOff', 30_000), waitMs: 20_000 },
            { message: buildDisplayMessage('DisplayStateLock', 50_000), waitMs: 5_000 },
            { message: buildDisplayMessage('DisplayStateOff', 55_000), waitMs: 3_000 },
            { message: buildDisplayMessage('DisplayStateLock', 58_000), waitMs: 30_000 },
          ]);
        });

        it('should trigger the offensive response once, on the second pull after the owner left', () => {
          expect(mockOffensiveResponseService.handleBreakInOffensiveResponse.mock.calls).toStrictEqual([
            [fakeVin, [fakeVehicle], new Date(fakeLockTime + 58_000).toISOString(), 20_000],
          ]);
        });
      });

      describe('When the key is recognised after the second pull', () => {
        beforeEach(async () => {
          await handleSequence([
            { message: buildDisplayMessage('DisplayStateLock'), waitMs: 10_000 },
            { message: buildDisplayMessage('DisplayStateLock', 10_000), waitMs: 12_000 },
            { message: buildDisplayMessage('DisplayStateAccessory', 22_000), waitMs: 20_000 },
          ]);
        });

        it('should still notify the owners for each pull', () => {
          expect(mockAlertNotifier.dispatch).toHaveBeenCalledTimes(2);
        });

        it('should cancel the offensive response', () => {
          expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
        });
      });
    });

    describe('When the VIN is shared by users with different settings', () => {
      const otherUserGroup: BreakInDetectionGroup = { ...repeatedPullsGroup, vehicles: [otherOwnerVehicle] };

      beforeEach(async () => {
        mockDetectionSettingsService.findGroupsByVin.mockResolvedValue([defaultGroup, otherUserGroup]);
        await handleSequence([{ message: buildDisplayMessage('DisplayStateLock'), waitMs: 60_000 }]);
      });

      it('should notify every owner once', () => {
        expect(mockAlertNotifier.dispatch).toHaveBeenCalledTimes(1);
      });

      it('should trigger the offensive response only for the users whose settings matched', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledWith(
          fakeVin,
          [fakeVehicle],
          new Date(fakeLockTime).toISOString(),
          5_000
        );
      });

      it('should not trigger the offensive response for the users who require repeated pulls', () => {
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('The flushPendingVerifications() method', () => {
    describe('When there are no pending verifications', () => {
      it('should resolve immediately', async () => {
        await expect(service.flushPendingVerifications(1_000)).resolves.toBeUndefined();
      });
    });

    describe('When there is a pending verification', () => {
      it('should wait for the verification to dispatch before resolving', async () => {
        await service.handle(buildDisplayMessage('DisplayStateLock'));

        const flushPromise = service.flushPendingVerifications(6_000);
        await jest.advanceTimersByTimeAsync(5_000);

        await expect(flushPromise).resolves.toBeUndefined();
        expect(mockAlertNotifier.dispatch).toHaveBeenCalled();
      });

      it('should resolve after the timeout when verifications are still pending', async () => {
        await service.handle(buildDisplayMessage('DisplayStateLock'));

        const flushPromise = service.flushPendingVerifications(1_000);
        await jest.advanceTimersByTimeAsync(1_000);

        await expect(flushPromise).resolves.toBeUndefined();
        expect(mockAlertNotifier.dispatch).not.toHaveBeenCalled();
      });
    });
  });
});
