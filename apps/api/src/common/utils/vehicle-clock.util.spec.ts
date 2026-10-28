import { isVehicleTimeTooFarAhead } from './vehicle-clock.util';

describe('The isVehicleTimeTooFarAhead() function', () => {
  const now = new Date('2026-10-17T12:00:00Z').getTime();

  beforeEach(() => {
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('When the vehicle time is in the past', () => {
    it('should accept it', () => {
      expect(isVehicleTimeTooFarAhead(now - 3_600_000)).toBe(false);
    });
  });

  describe('When the vehicle clock is up to five minutes ahead of the server', () => {
    it('should accept it', () => {
      expect(isVehicleTimeTooFarAhead(now + 300_000)).toBe(false);
    });
  });

  describe('When the vehicle clock is more than five minutes ahead of the server', () => {
    it('should reject it', () => {
      expect(isVehicleTimeTooFarAhead(now + 300_001)).toBe(true);
    });
  });
});
