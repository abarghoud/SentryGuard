import { shouldRequestConsent } from './consent-gate.helpers';

describe('The shouldRequestConsent() function', () => {
  describe('When the consent status is not loaded yet', () => {
    it('should not request consent', () => {
      expect(shouldRequestConsent(undefined, true)).toBe(false);
    });
  });

  describe('When the user has a valid consent', () => {
    it('should not request consent', () => {
      expect(shouldRequestConsent({ hasConsent: true }, true)).toBe(false);
    });
  });

  describe('When the consent is missing and the onboarding is complete', () => {
    it('should request consent', () => {
      expect(shouldRequestConsent({ hasConsent: false }, true)).toBe(true);
    });
  });

  describe('When the consent is missing and the onboarding is not complete', () => {
    it('should let the onboarding handle the consent step', () => {
      expect(shouldRequestConsent({ hasConsent: false }, false)).toBe(false);
    });
  });

  describe('When the consent is missing because it was revoked', () => {
    it('should request consent', () => {
      expect(shouldRequestConsent({ hasConsent: false, isRevoked: true }, true)).toBe(true);
    });
  });
});
