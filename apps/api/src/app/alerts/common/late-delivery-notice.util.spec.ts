import { describeLateDelivery } from './late-delivery-notice.util';

describe('The describeLateDelivery() function', () => {
  const now = new Date('2026-11-20T00:26:00.000Z');
  const detectedMinutesAgo = (minutes: number): Date => new Date(now.getTime() - minutes * 60_000);

  beforeEach(() => {
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('When the detection time is unknown', () => {
    it('should return null', () => {
      expect(describeLateDelivery(undefined, 'en')).toBeNull();
    });
  });

  describe('When the alert is delivered less than two minutes after its detection', () => {
    it('should return null', () => {
      expect(describeLateDelivery(new Date(now.getTime() - 119_999), 'en')).toBeNull();
    });
  });

  describe('When the alert is delivered a few minutes late', () => {
    it('should give the delay in minutes', () => {
      expect(describeLateDelivery(detectedMinutesAgo(7), 'en')).toBe('Delayed alert: detected 7 min ago.');
    });
  });

  describe('When the alert is delivered a whole number of hours late', () => {
    it('should give the delay in hours only', () => {
      expect(describeLateDelivery(detectedMinutesAgo(120), 'en')).toBe('Delayed alert: detected 2 h ago.');
    });
  });

  describe('When a French user receives an alert more than an hour late', () => {
    it('should give the delay in hours and minutes in French', () => {
      expect(describeLateDelivery(detectedMinutesAgo(127), 'fr')).toBe('Alerte retardée : détectée il y a 2 h 7 min.');
    });
  });
});
