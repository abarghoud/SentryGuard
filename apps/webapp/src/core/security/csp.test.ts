import { buildCspHeader, isLocaleRoute } from './csp';

describe('The buildCspHeader() function', () => {
  describe('When in production', () => {
    it('should not allow unsafe-eval', () => {
      expect(buildCspHeader('https://api.example.com', true)).not.toContain('unsafe-eval');
    });

    it('should allow the configured API origin in connect-src', () => {
      expect(buildCspHeader('https://api.example.com', true)).toContain(
        "connect-src 'self' https://api.example.com"
      );
    });

    it('should deny framing of the page', () => {
      expect(buildCspHeader('https://api.example.com', true)).toContain(
        "frame-ancestors 'none'"
      );
    });

    it('should allow the Crisp and BuyMeACoffee third parties', () => {
      expect(buildCspHeader('https://api.example.com', true)).toContain(
        'https://client.crisp.chat'
      );
    });
  });

  describe('When in development', () => {
    it('should allow unsafe-eval for React Refresh', () => {
      expect(buildCspHeader('http://localhost:3001', false)).toContain("'unsafe-eval'");
    });
  });
});

describe('The isLocaleRoute() function', () => {
  describe('When the path is a public locale route', () => {
    it('should return true for FAQ route', () => {
      expect(isLocaleRoute('/en/faq')).toBe(true);
    });

    it('should return true for supporters route', () => {
      expect(isLocaleRoute('/en/supporters')).toBe(true);
    });
  });

  describe('When the path is an authenticated app route', () => {
    it('should return false', () => {
      expect(isLocaleRoute('/dashboard')).toBe(false);
    });
  });

  describe('When the path is the OAuth callback route', () => {
    it('should return false', () => {
      expect(isLocaleRoute('/callback')).toBe(false);
    });
  });
});
