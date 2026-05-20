import { ChargePortLatchTrackerService } from './charge-port-latch-tracker.service';

describe('The ChargePortLatchTrackerService class', () => {
  let service: ChargePortLatchTrackerService;
  const fakeVin = 'fake-vin';
  const baseTimestamp = 1000000;

  beforeEach(() => {
    service = new ChargePortLatchTrackerService();
    jest.useFakeTimers();
    jest.setSystemTime(baseTimestamp);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('The trackLatchEvent() method', () => {
    describe('When tracking a ChargePortLatchEngaged state', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp, 'ChargePortLatchEngaged');
      });

      it('should NOT record an event timestamp to avoid false positives on wake up', () => {
        const hasEvent = service.hasLatchEventAround(fakeVin, baseTimestamp);
        expect(hasEvent).toStrictEqual(false);
      });
    });

    describe('When tracking a ChargePortLatchDisengaged state', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp, 'ChargePortLatchDisengaged');
      });

      it('should store the event timestamp and make it available for checking', () => {
        const hasEvent = service.hasLatchEventAround(fakeVin, baseTimestamp);
        expect(hasEvent).toStrictEqual(true);
      });
    });

    describe('When tracking an event without a state value', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp, undefined);
      });

      it('should ignore it', () => {
        const hasEvent = service.hasLatchEventAround(fakeVin, baseTimestamp);
        expect(hasEvent).toStrictEqual(false);
      });
    });
  });

  describe('The hasLatchEventAround() method and cleanup', () => {
    beforeEach(() => {
      service.trackLatchEvent(fakeVin, baseTimestamp, 'ChargePortLatchDisengaged');
    });

    describe('When an event exists exactly at the given timestamp', () => {
      it('should return true', () => {
        expect(service.hasLatchEventAround(fakeVin, baseTimestamp)).toStrictEqual(true);
      });
    });

    describe('When an event exists within WINDOW_MS before the timestamp', () => {
      it('should return true', () => {
        expect(service.hasLatchEventAround(fakeVin, baseTimestamp + 4000)).toStrictEqual(true);
      });
    });

    describe('When an event exists within WINDOW_MS after the timestamp', () => {
      it('should return true', () => {
        expect(service.hasLatchEventAround(fakeVin, baseTimestamp - 4000)).toStrictEqual(true);
      });
    });

    describe('When an event exists outside WINDOW_MS', () => {
      it('should return false', () => {
        expect(service.hasLatchEventAround(fakeVin, baseTimestamp + 6000)).toStrictEqual(false);
      });
    });
  });

  describe('The cleanup mechanism', () => {
    describe('When tracking an event older than CLEANUP_MS', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp - 20000, 'ChargePortLatchDisengaged');
      });

      it('should clean up the old event after a query triggers the lazy cleanup', () => {
        service.hasLatchEventAround(fakeVin, baseTimestamp);

        const hasEvent = service.hasLatchEventAround(fakeVin, baseTimestamp - 20000);
        expect(hasEvent).toStrictEqual(false);
      });
    });
  });
});
