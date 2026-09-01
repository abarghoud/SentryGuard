import {
  isPrivateSupporter,
  isProfaneOrSpam,
  sanitizeMessage,
  sanitizeName,
} from './supporter-sanitizer.util';

describe('The supporter-sanitizer utility', () => {
  describe('The isProfaneOrSpam() function', () => {
    describe('When text is clean', () => {
      it('should return false', () => {
        expect(isProfaneOrSpam('Alexandre')).toBe(false);
        expect(isProfaneOrSpam('Merci pour votre super travail !')).toBe(false);
      });
    });

    describe('When text contains web links or domain names', () => {
      it('should detect URLs and domain extensions', () => {
        expect(isProfaneOrSpam('https://scam.com')).toBe(true);
        expect(isProfaneOrSpam('visit my site www.crypto.io')).toBe(true);
        expect(isProfaneOrSpam('join t.me/free_crypto')).toBe(true);
      });
    });

    describe('When text contains forbidden profanities', () => {
      it('should return true for profanities regardless of accents and case', () => {
        expect(isProfaneOrSpam('gros connard')).toBe(true);
        expect(isProfaneOrSpam('espèce d\'enculé')).toBe(true);
        expect(isProfaneOrSpam('FUCK THIS')).toBe(true);
      });
    });
  });

  describe('The sanitizeName() function', () => {
    describe('When supporter is marked as private', () => {
      it('should return Anonyme', () => {
        expect(sanitizeName('John Doe', true)).toBe('Anonyme');
      });
    });

    describe('When supporter name is generic or offensive', () => {
      it('should return Anonyme', () => {
        expect(sanitizeName('Someone')).toBe('Anonyme');
        expect(sanitizeName('Anonymous')).toBe('Anonyme');
        expect(sanitizeName('https://spam.com')).toBe('Anonyme');
        expect(sanitizeName('Hitler')).toBe('Anonyme');
      });
    });

    describe('When supporter name is an email address', () => {
      it('should return Anonyme to protect privacy', () => {
        expect(sanitizeName('john.doe@example.com')).toBe('Anonyme');
      });
    });

    describe('When supporter name is excessively long', () => {
      it('should truncate to 30 characters', () => {
        const longName = 'ThisIsAVeryLongSupporterNameThatExceedsTheLimit';
        const result = sanitizeName(longName);
        expect(result.length).toBeLessThanOrEqual(30);
        expect(result.endsWith('...')).toBe(true);
      });
    });
  });

  describe('The sanitizeMessage() function', () => {
    describe('When message is private or contains spam/profanity', () => {
      it('should return undefined', () => {
        expect(sanitizeMessage('Nice app', true)).toBeUndefined();
        expect(sanitizeMessage('Visit https://gambling.com')).toBeUndefined();
        expect(sanitizeMessage('salope')).toBeUndefined();
      });
    });

    describe('When message is clean', () => {
      it('should return the trimmed message', () => {
        expect(sanitizeMessage('  Bravo pour cette app !  ')).toBe('Bravo pour cette app !');
      });
    });

    describe('When message is excessively long', () => {
      it('should truncate to 120 characters', () => {
        const longMsg = 'a'.repeat(200);
        const result = sanitizeMessage(longMsg);
        expect(result?.length).toBeLessThanOrEqual(120);
        expect(result?.endsWith('...')).toBe(true);
      });
    });
  });

  describe('The isPrivateSupporter() function', () => {
    describe('When data has private flags set to true', () => {
      it('should return true', () => {
        expect(isPrivateSupporter({ is_private: true })).toBe(true);
        expect(isPrivateSupporter({ payer_is_private: 'true' })).toBe(true);
        expect(isPrivateSupporter({ is_anonymous: '1' })).toBe(true);
      });
    });

    describe('When data has no private flags', () => {
      it('should return false', () => {
        expect(isPrivateSupporter({})).toBe(false);
        expect(isPrivateSupporter({ is_private: false })).toBe(false);
      });
    });
  });
});
