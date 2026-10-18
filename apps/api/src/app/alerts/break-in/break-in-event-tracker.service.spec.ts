import { BreakInEventTrackerService, BreakInTrackedEvent } from './break-in-event-tracker.service';

describe('The BreakInEventTrackerService class', () => {
  const fakeVin = 'fake-vin';
  const baseTimestamp = new Date('2026-10-17T12:00:00Z').getTime();
  let service: BreakInEventTrackerService;

  const trackLocks = (...offsets: number[]): void => {
    offsets.forEach(offset => service.track(fakeVin, BreakInTrackedEvent.CenterDisplayLock, baseTimestamp + offset));
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: baseTimestamp });
    service = new BreakInEventTrackerService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('The track() method', () => {
    describe('When the event is new', () => {
      it('should report it as not tracked yet', () => {
        expect(service.track(fakeVin, BreakInTrackedEvent.CenterDisplayLock, baseTimestamp)).toStrictEqual({ isAlreadyTracked: false });
      });
    });

    describe('When the same event is replayed', () => {
      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.CenterDisplayLock, baseTimestamp);
      });

      it('should report it as already tracked', () => {
        expect(service.track(fakeVin, BreakInTrackedEvent.CenterDisplayLock, baseTimestamp)).toStrictEqual({ isAlreadyTracked: true });
      });
    });

    describe('When the event was received more than three minutes ago', () => {
      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp);
        jest.advanceTimersByTime(180_001);
      });

      it('should forget it', () => {
        expect(service.hasEventSince(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp)).toStrictEqual(false);
      });
    });

    describe('When the event was received less than three minutes ago', () => {
      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp);
        jest.advanceTimersByTime(179_000);
      });

      it('should keep it', () => {
        expect(service.hasEventSince(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp)).toStrictEqual(true);
      });
    });

    describe('When the vehicle clock is far ahead of the server clock', () => {
      const farFutureTimestamp = baseTimestamp + 365 * 24 * 3_600_000;

      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, farFutureTimestamp);
        jest.advanceTimersByTime(180_001);
      });

      it('should forget the event three minutes after receiving it', () => {
        expect(service.hasEventSince(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp)).toStrictEqual(false);
      });
    });
  });

  describe('The hasEventAround() method', () => {
    beforeEach(() => {
      service.track(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp);
    });

    describe('When the event is within 5000ms of the checked timestamp', () => {
      it('should report the event', () => {
        expect(service.hasEventAround(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp + 4_900)).toStrictEqual(true);
      });
    });

    describe('When the event is more than 5000ms away from the checked timestamp', () => {
      it('should not report the event', () => {
        expect(service.hasEventAround(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp + 5_100)).toStrictEqual(false);
      });
    });

    describe('When another event type is checked', () => {
      it('should not report the event', () => {
        expect(service.hasEventAround(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp)).toStrictEqual(false);
      });
    });

    describe('When another VIN is checked', () => {
      it('should not report the event', () => {
        expect(service.hasEventAround('other-vin', BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp)).toStrictEqual(false);
      });
    });
  });

  describe('The hasEventSince() method', () => {
    beforeEach(() => {
      service.track(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp + 45_000);
    });

    describe('When the event happened after the checked timestamp', () => {
      it('should report the event however late it is', () => {
        expect(service.hasEventSince(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp)).toStrictEqual(true);
      });
    });

    describe('When the event happened before the checked timestamp', () => {
      it('should not report the event', () => {
        expect(service.hasEventSince(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp + 46_000)).toStrictEqual(false);
      });
    });
  });

  describe('The findRepeatedPullTrigger() method', () => {
    describe('When there is a single lock', () => {
      beforeEach(() => {
        trackLocks(0);
      });

      it('should not trigger', () => {
        expect(service.findRepeatedPullTrigger(fakeVin, baseTimestamp)).toBeNull();
      });
    });

    describe('When a second lock follows within a minute', () => {
      beforeEach(() => {
        trackLocks(0, 15_000);
      });

      it('should trigger on the second lock, starting the burst at the first one', () => {
        expect(service.findRepeatedPullTrigger(fakeVin, baseTimestamp + 15_000)).toStrictEqual({
          burstStartTime: baseTimestamp,
          lockTime: baseTimestamp + 15_000,
        });
      });
    });

    describe('When a third lock follows within the same minute', () => {
      beforeEach(() => {
        trackLocks(0, 15_000, 30_000);
      });

      it('should not trigger again', () => {
        expect(service.findRepeatedPullTrigger(fakeVin, baseTimestamp + 30_000)).toBeNull();
      });
    });

    describe('When the two locks are more than a minute apart', () => {
      beforeEach(() => {
        trackLocks(0, 61_000);
      });

      it('should not trigger', () => {
        expect(service.findRepeatedPullTrigger(fakeVin, baseTimestamp + 61_000)).toBeNull();
      });
    });

    describe('When the owner was active between the two locks', () => {
      beforeEach(() => {
        trackLocks(0);
        service.track(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp + 10_000);
        trackLocks(50_000);
      });

      it('should not count the lock before the owner activity', () => {
        expect(service.findRepeatedPullTrigger(fakeVin, baseTimestamp + 50_000)).toBeNull();
      });

      it('should start a new burst after the owner activity', () => {
        trackLocks(55_000);

        expect(service.findRepeatedPullTrigger(fakeVin, baseTimestamp + 55_000)).toStrictEqual({
          burstStartTime: baseTimestamp + 50_000,
          lockTime: baseTimestamp + 55_000,
        });
      });
    });
  });
});
