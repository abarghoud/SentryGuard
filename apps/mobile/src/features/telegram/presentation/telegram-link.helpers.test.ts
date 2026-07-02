import { resolveRemainingLinkMinutes } from './telegram-link.helpers';

describe('The resolveRemainingLinkMinutes() function', () => {
  const now = new Date('2026-06-12T10:00:00.000Z');

  describe('When the link expires later', () => {
    it('should return the remaining minutes rounded up', () => {
      expect(resolveRemainingLinkMinutes('2026-06-12T10:09:30.000Z', now)).toBe(10);
    });
  });

  describe('When the link is already expired', () => {
    it('should floor at zero', () => {
      expect(resolveRemainingLinkMinutes('2026-06-12T09:00:00.000Z', now)).toBe(0);
    });
  });

  describe('When the status carries no expiry', () => {
    it('should return null', () => {
      expect(resolveRemainingLinkMinutes(undefined, now)).toBeNull();
    });
  });

  describe('When the expiry date is malformed', () => {
    it('should return null instead of NaN', () => {
      expect(resolveRemainingLinkMinutes('not-a-date', now)).toBeNull();
    });
  });
});
