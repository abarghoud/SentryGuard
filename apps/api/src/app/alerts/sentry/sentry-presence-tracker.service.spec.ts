import { SentryPresenceTrackerService } from './sentry-presence-tracker.service';

describe('The SentryPresenceTrackerService class', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('The watch() method', () => {
    describe('When the VIN stays Aware past the threshold', () => {
      const onSustained = jest.fn();

      beforeEach(() => {
        const tracker = new SentryPresenceTrackerService();
        tracker.watch('VIN1', onSustained);
        jest.advanceTimersByTime(15_000);
      });

      it('should fire the sustained-presence callback', () => {
        expect(onSustained).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the VIN stays Aware well beyond the cap', () => {
      const onSustained = jest.fn();

      beforeEach(() => {
        const tracker = new SentryPresenceTrackerService();
        tracker.watch('VIN1', onSustained);
        jest.advanceTimersByTime(120_000);
      });

      it('should fire up to the cap, flagging only the last alert as final', () => {
        expect(onSustained.mock.calls.map((call) => call[0])).toEqual([false, false, true]);
      });
    });

    describe('When cleared before the threshold', () => {
      const onSustained = jest.fn();

      beforeEach(() => {
        const tracker = new SentryPresenceTrackerService();
        tracker.watch('VIN1', onSustained);
        jest.advanceTimersByTime(10_000);
        tracker.clear('VIN1');
        jest.advanceTimersByTime(120_000);
      });

      it('should never fire', () => {
        expect(onSustained).not.toHaveBeenCalled();
      });
    });

    describe('When cleared after firing but before the cap', () => {
      const onSustained = jest.fn();

      beforeEach(() => {
        const tracker = new SentryPresenceTrackerService();
        tracker.watch('VIN1', onSustained);
        jest.advanceTimersByTime(30_000);
        tracker.clear('VIN1');
        jest.advanceTimersByTime(120_000);
      });

      it('should stop at the count it had reached', () => {
        expect(onSustained).toHaveBeenCalledTimes(2);
      });
    });

    describe('When a new Aware episode starts after the vehicle left Aware', () => {
      const onSustained = jest.fn();

      beforeEach(() => {
        const tracker = new SentryPresenceTrackerService();
        tracker.watch('VIN1', onSustained);
        jest.advanceTimersByTime(120_000);
        tracker.clear('VIN1');
        tracker.watch('VIN1', onSustained);
        jest.advanceTimersByTime(120_000);
      });

      it('should allow the cap to fire again for the new episode', () => {
        expect(onSustained).toHaveBeenCalledTimes(6);
      });
    });

    describe('When watch is called twice for the same VIN', () => {
      const onSustained = jest.fn();

      beforeEach(() => {
        const tracker = new SentryPresenceTrackerService();
        tracker.watch('VIN1', onSustained);
        tracker.watch('VIN1', onSustained);
        jest.advanceTimersByTime(15_000);
      });

      it('should run a single interval', () => {
        expect(onSustained).toHaveBeenCalledTimes(1);
      });
    });
  });
});
