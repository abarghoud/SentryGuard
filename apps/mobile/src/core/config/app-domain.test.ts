import { buildAppUrl, buildTeslaPairingUrl, normalizeDomain } from './app-domain';

describe('The normalizeDomain() function', () => {
  describe('When given a bare domain', () => {
    it('should return it unchanged', () => {
      expect(normalizeDomain('mydomain.com')).toBe('mydomain.com');
    });
  });

  describe('When given an https URL', () => {
    it('should return only the host', () => {
      expect(normalizeDomain('https://mydomain.com')).toBe('mydomain.com');
    });
  });

  describe('When given an http URL', () => {
    it('should return only the host', () => {
      expect(normalizeDomain('http://mydomain.com')).toBe('mydomain.com');
    });
  });

  describe('When given a URL with a trailing path', () => {
    it('should return only the host', () => {
      expect(normalizeDomain('https://mydomain.com/en/legal/privacy')).toBe('mydomain.com');
    });
  });

  describe('When given a legacy Tesla pairing URL', () => {
    it('should extract the domain after /_ak/', () => {
      expect(normalizeDomain('https://tesla.com/_ak/mydomain.com')).toBe('mydomain.com');
    });
  });

  describe('When given surrounding whitespace', () => {
    it('should trim and normalize', () => {
      expect(normalizeDomain('  https://mydomain.com  ')).toBe('mydomain.com');
    });
  });

  describe('When given an empty value', () => {
    it('should return an empty string', () => {
      expect(normalizeDomain('   ')).toBe('');
    });
  });
});

describe('The buildTeslaPairingUrl() function', () => {
  describe('When given a domain', () => {
    it('should build the Tesla pairing URL', () => {
      expect(buildTeslaPairingUrl('mydomain.com')).toBe('https://tesla.com/_ak/mydomain.com');
    });
  });

  describe('When given an empty domain', () => {
    it('should return an empty string', () => {
      expect(buildTeslaPairingUrl('')).toBe('');
    });
  });
});

describe('The buildAppUrl() function', () => {
  describe('When given a domain and a path', () => {
    it('should build an https URL on that domain', () => {
      expect(buildAppUrl('mydomain.com', '/en/legal/privacy')).toBe('https://mydomain.com/en/legal/privacy');
    });
  });

  describe('When given an empty domain', () => {
    it('should return an empty string', () => {
      expect(buildAppUrl('', '/en/legal/privacy')).toBe('');
    });
  });
});
