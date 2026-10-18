import { SentryModeStateTrackerService } from './sentry-mode-state-tracker.service';
import { TelemetryDatum, TelemetryMessage, TelemetryValue } from '../telemetry/models/telemetry-message.model';

describe('The SentryModeStateTrackerService class', () => {
  const fakeVin = 'XP7YGCER1TB919128';
  const baseTime = new Date('2026-10-16T12:00:00Z').getTime();
  let tracker: SentryModeStateTrackerService;

  const buildDatum = (key: string, value: Record<string, string>): TelemetryDatum => {
    const datum = new TelemetryDatum();
    datum.key = key;
    datum.value = Object.assign(new TelemetryValue(), value);
    return datum;
  };

  const buildMessage = (data: TelemetryDatum[], offsetMs: number): TelemetryMessage => {
    const message = new TelemetryMessage();
    message.vin = fakeVin;
    message.createdAt = new Date(baseTime + offsetMs).toISOString();
    message.data = data;
    return message;
  };

  const buildSentryModeMessage = (sentryModeStateValue: string, offsetMs = 0): TelemetryMessage =>
    buildMessage([buildDatum('SentryMode', { sentryModeStateValue })], offsetMs);

  const buildLockMessage = (offsetMs = 0, reportedSentryModeState?: string): TelemetryMessage => {
    const lockDatum = buildDatum('CenterDisplay', { displayStateValue: 'DisplayStateLock' });
    const sentryModeData = reportedSentryModeState ? [buildDatum('SentryMode', { sentryModeStateValue: reportedSentryModeState })] : [];
    return buildMessage([lockDatum, ...sentryModeData], offsetMs);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(baseTime);
    tracker = new SentryModeStateTrackerService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('The isSentryModeActiveAt() method', () => {
    describe('When the lock message itself reports Sentry Mode on', () => {
      it('should report Sentry Mode as active', () => {
        expect(tracker.isSentryModeActiveAt(buildLockMessage(0, 'SentryModeStateIdle'))).toStrictEqual(true);
      });
    });

    describe('When the lock message itself reports Sentry Mode off after an enabled state', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateArmed'));
      });

      it('should report Sentry Mode as inactive', () => {
        expect(tracker.isSentryModeActiveAt(buildLockMessage(1_000, 'SentryModeStateOff'))).toStrictEqual(false);
      });
    });

    describe('When Sentry Mode was reported on before the lock', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateIdle'));
      });

      it('should report Sentry Mode as active', () => {
        expect(tracker.isSentryModeActiveAt(buildLockMessage(30_000))).toStrictEqual(true);
      });
    });

    describe('When a later Sentry Mode change was processed before the lock', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateIdle'));
        await tracker.handle(buildSentryModeMessage('SentryModeStateOff', 10_000));
      });

      it('should use the state the vehicle was in at the lock', () => {
        expect(tracker.isSentryModeActiveAt(buildLockMessage(5_000))).toStrictEqual(true);
      });
    });

    describe('When Sentry Mode was only reported on after the lock', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateIdle', 5_000));
      });

      it('should not report Sentry Mode as active', () => {
        expect(tracker.isSentryModeActiveAt(buildLockMessage(0))).toStrictEqual(false);
      });
    });

    describe('When Sentry Mode was reported off before the lock', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateOff'));
      });

      it('should report Sentry Mode as inactive', () => {
        expect(tracker.isSentryModeActiveAt(buildLockMessage(30_000))).toStrictEqual(false);
      });
    });

    describe('When the last enabled state is more than an hour old', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateIdle'));
        jest.advanceTimersByTime(3_600_001);
      });

      it('should no longer trust it', () => {
        expect(tracker.isSentryModeActiveAt(buildLockMessage(3_600_001))).toStrictEqual(false);
      });
    });
  });

  describe('The wasSentryModeActiveAt() method', () => {
    beforeEach(async () => {
      await tracker.handle(buildSentryModeMessage('SentryModeStateOff'));
      await tracker.handle(buildSentryModeMessage('SentryModeStateArmed', 10_000));
      await tracker.handle(buildSentryModeMessage('SentryModeStateOff', 20_000));
    });

    describe('When Sentry Mode was armed at the given vehicle time', () => {
      it('should report Sentry Mode as active', () => {
        expect(tracker.wasSentryModeActiveAt(fakeVin, baseTime + 15_000)).toStrictEqual(true);
      });
    });

    describe('When Sentry Mode was off at the given vehicle time', () => {
      it('should report Sentry Mode as inactive', () => {
        expect(tracker.wasSentryModeActiveAt(fakeVin, baseTime + 25_000)).toStrictEqual(false);
      });
    });
  });

  describe('The isSentryModeActive() method', () => {
    describe('When nothing is known about the vehicle', () => {
      it('should report Sentry Mode as inactive', () => {
        expect(tracker.isSentryModeActive(fakeVin)).toStrictEqual(false);
      });
    });

    describe('When the vehicle reported an enabled Sentry Mode state', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateIdle'));
      });

      it('should report Sentry Mode as active', () => {
        expect(tracker.isSentryModeActive(fakeVin)).toStrictEqual(true);
      });
    });

    describe('When the vehicle reported that Sentry Mode is off', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateArmed'));
        await tracker.handle(buildSentryModeMessage('SentryModeStateOff', 1_000));
      });

      it('should report Sentry Mode as inactive', () => {
        expect(tracker.isSentryModeActive(fakeVin)).toStrictEqual(false);
      });
    });

    describe('When an older state arrives after a newer one', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateOff', 1_000));
        await tracker.handle(buildSentryModeMessage('SentryModeStateArmed'));
      });

      it('should keep the newer state', () => {
        expect(tracker.isSentryModeActive(fakeVin)).toStrictEqual(false);
      });
    });

    describe('When a state dated more than a minute ahead of the server clock arrives', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateArmed', 3_600_000));
        await tracker.handle(buildSentryModeMessage('SentryModeStateOff', 1_000));
      });

      it('should ignore it and keep following the vehicle', () => {
        expect(tracker.isSentryModeActive(fakeVin)).toStrictEqual(false);
      });
    });

    describe('When the last enabled state is more than an hour old', () => {
      beforeEach(async () => {
        await tracker.handle(buildSentryModeMessage('SentryModeStateArmed'));
        jest.advanceTimersByTime(3_600_001);
      });

      it('should no longer trust it', () => {
        expect(tracker.isSentryModeActive(fakeVin)).toStrictEqual(false);
      });
    });
  });
});
