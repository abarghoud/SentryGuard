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
    describe('When tracking a single event', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp);
      });

      it('should store the event and make it available for checking', () => {
        const hasEvent = service.hasLatchEventAround(fakeVin, baseTimestamp);
        expect(hasEvent).toStrictEqual(true);
      });
    });

    describe('When tracking an event older than CLEANUP_MS', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp - 20000);
      });

      it('should clean up the old event', () => {
        const hasEvent = service.hasLatchEventAround(fakeVin, baseTimestamp);
        expect(hasEvent).toStrictEqual(false);
      });
    });
  });

  describe('The hasLatchEventAround() method', () => {
    describe('When an event exists exactly at the given timestamp', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp);
      });

      it('should return true', () => {
        expect(service.hasLatchEventAround(fakeVin, baseTimestamp)).toStrictEqual(true);
      });
    });

    describe('When an event exists within WINDOW_MS before the timestamp', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp - 4000);
      });

      it('should return true', () => {
        expect(service.hasLatchEventAround(fakeVin, baseTimestamp)).toStrictEqual(true);
      });
    });

    describe('When an event exists within WINDOW_MS after the timestamp', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp + 4000);
      });

      it('should return true', () => {
        expect(service.hasLatchEventAround(fakeVin, baseTimestamp)).toStrictEqual(true);
      });
    });

    describe('When an event exists outside WINDOW_MS', () => {
      beforeEach(() => {
        service.trackLatchEvent(fakeVin, baseTimestamp - 6000);
      });

      it('should return false', () => {
        expect(service.hasLatchEventAround(fakeVin, baseTimestamp)).toStrictEqual(false);
      });
    });

    describe('When no events exist for the given vin', () => {
      beforeEach(() => {
        service.trackLatchEvent('other-vin', baseTimestamp);
      });

      it('should return false', () => {
        expect(service.hasLatchEventAround(fakeVin, baseTimestamp)).toStrictEqual(false);
      });
    });
  });
});
