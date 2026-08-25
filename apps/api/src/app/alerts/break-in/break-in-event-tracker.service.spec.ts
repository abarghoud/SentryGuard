import { BreakInEventTrackerService, BreakInTrackedEvent } from './break-in-event-tracker.service';

describe('The BreakInEventTrackerService class', () => {
  let service: BreakInEventTrackerService;
  const fakeVin = 'fake-vin';
  const baseTimestamp = 1000000;

  beforeEach(() => {
    service = new BreakInEventTrackerService();
    jest.useFakeTimers();
    jest.setSystemTime(baseTimestamp);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('The track() and hasEventAround() methods for ChargePortLatchDisengaged', () => {
    describe('When tracking a latch event', () => {
      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp);
      });

      it('should store the event timestamp and make it available for checking', () => {
        const hasEvent = service.hasEventAround(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp);
        expect(hasEvent).toStrictEqual(true);
      });

      it('should return true when the event is within 5000ms of the checked timestamp', () => {
        const hasEvent = service.hasEventAround(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp + 4900);
        expect(hasEvent).toStrictEqual(true);
      });

      it('should return false when the event is outside 5000ms of the checked timestamp', () => {
        const hasEvent = service.hasEventAround(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp + 5100);
        expect(hasEvent).toStrictEqual(false);
      });
    });
  });

  describe('The track() and CenterDisplayOwnerActivity query methods', () => {
    describe('When tracking CenterDisplay owner activity', () => {
      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp);
      });

      it('should store the event timestamp and make it available for checking', () => {
        const hasEvent = service.hasEventAround(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp);
        expect(hasEvent).toStrictEqual(true);
      });

      it('should return true when the event is within 5000ms of the checked timestamp', () => {
        const hasEvent = service.hasEventAround(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp + 4900);
        expect(hasEvent).toStrictEqual(true);
      });

      it('should return false when the event is outside 5000ms of the checked timestamp', () => {
        const hasEvent = service.hasEventAround(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp + 5100);
        expect(hasEvent).toStrictEqual(false);
      });

      it('should return true when the event occurs after the checked timestamp within 5000ms', () => {
        const hasEvent = service.hasEventAfter(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp - 4900);
        expect(hasEvent).toStrictEqual(true);
      });

      it('should return false when the event occurs before the checked timestamp', () => {
        const hasEvent = service.hasEventAfter(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp + 1);
        expect(hasEvent).toStrictEqual(false);
      });
    });
  });

  describe('The event type isolation', () => {
    describe('When only CenterDisplay owner activity was tracked', () => {
      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp);
      });

      it('should not report a latch event', () => {
        const hasEvent = service.hasEventAround(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp);
        expect(hasEvent).toStrictEqual(false);
      });
    });

    describe('When only a latch event was tracked', () => {
      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp);
      });

      it('should not report CenterDisplay owner activity', () => {
        const hasEvent = service.hasEventAround(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp);
        expect(hasEvent).toStrictEqual(false);
      });
    });

    describe('When events are tracked for different VINs', () => {
      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp);
      });

      it('should not report the event for another VIN', () => {
        const hasEvent = service.hasEventAround('other-vin', BreakInTrackedEvent.CenterDisplayOwnerActivity, baseTimestamp);
        expect(hasEvent).toStrictEqual(false);
      });
    });
  });

  describe('The cleanup mechanism', () => {
    describe('When tracking an event older than its cleanupMs', () => {
      beforeEach(() => {
        service.track(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp - 20000);
      });

      it('should clean up the old event after a query triggers the lazy cleanup', () => {
        service.hasEventAround(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp);

        const hasEvent = service.hasEventAround(fakeVin, BreakInTrackedEvent.ChargePortLatchDisengaged, baseTimestamp - 20000);
        expect(hasEvent).toStrictEqual(false);
      });
    });
  });
});
