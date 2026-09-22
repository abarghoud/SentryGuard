import { resolveTeslaCameraUrl } from './tesla-camera-link';

describe('The resolveTeslaCameraUrl() function', () => {
  const fakeVin = '5YJ3E1EA7KF000316';
  const fakeTemplate = 'tesla://camera-view/{vin}';
  const originalTemplate = process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE;

  afterEach(() => {
    process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = originalTemplate;
  });

  describe('When the template is configured and the VIN is well-formed', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = fakeTemplate;
    });

    it('should substitute the VIN into the template', () => {
      expect(resolveTeslaCameraUrl(fakeVin)).toBe('tesla://camera-view/5YJ3E1EA7KF000316');
    });
  });

  describe('When the template repeats the placeholder', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = 'tesla://camera-view/{vin}?vehicle={vin}';
    });

    it('should substitute every occurrence', () => {
      expect(resolveTeslaCameraUrl(fakeVin)).toBe(
        'tesla://camera-view/5YJ3E1EA7KF000316?vehicle=5YJ3E1EA7KF000316'
      );
    });
  });

  describe('When the template is surrounded by whitespace', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = `  ${fakeTemplate}  `;
    });

    it('should trim it before substituting the VIN', () => {
      expect(resolveTeslaCameraUrl(fakeVin)).toBe('tesla://camera-view/5YJ3E1EA7KF000316');
    });
  });

  describe('When the template is not configured', () => {
    beforeEach(() => {
      delete process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE;
    });

    it('should resolve no camera url', () => {
      expect(resolveTeslaCameraUrl(fakeVin)).toBeNull();
    });
  });

  describe('When the template is blank', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = '   ';
    });

    it('should resolve no camera url', () => {
      expect(resolveTeslaCameraUrl(fakeVin)).toBeNull();
    });
  });

  describe('When the template targets another scheme', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = 'https://attacker.example/{vin}';
    });

    it('should resolve no camera url', () => {
      expect(resolveTeslaCameraUrl(fakeVin)).toBeNull();
    });
  });

  describe('When the template carries no VIN placeholder', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = 'tesla://camera-view';
    });

    it('should resolve no camera url', () => {
      expect(resolveTeslaCameraUrl(fakeVin)).toBeNull();
    });
  });

  describe('When no VIN is provided', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = fakeTemplate;
    });

    it('should resolve no camera url', () => {
      expect(resolveTeslaCameraUrl(undefined)).toBeNull();
    });
  });

  describe('When the VIN is too short', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = fakeTemplate;
    });

    it('should resolve no camera url', () => {
      expect(resolveTeslaCameraUrl('5YJ3E1EA7KF')).toBeNull();
    });
  });

  describe('When the VIN carries characters excluded from the VIN alphabet', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = fakeTemplate;
    });

    it('should resolve no camera url', () => {
      expect(resolveTeslaCameraUrl('5YJ3E1EA7KFOOO316')).toBeNull();
    });
  });

  describe('When the VIN would smuggle a path into the url', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = fakeTemplate;
    });

    it('should resolve no camera url', () => {
      expect(resolveTeslaCameraUrl('../../unlock/5YJ3E1')).toBeNull();
    });
  });
});
