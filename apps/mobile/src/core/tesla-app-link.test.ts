import * as Linking from 'expo-linking';

import { buildFallbackUrl, openTeslaApp } from './tesla-app-link';

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

describe('The openTeslaApp() function', () => {
  const fallbackUrl = 'https://api.sentryguard.org/redirect/tesla-app?userId=user-123&lang=fr';
  const fakeVin = '5YJ3E1EA7KF000316';
  const fakeCameraTemplate = 'tesla://camera-view/{vin}';
  const originalTemplate = process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = originalTemplate;
  });

  describe('When the Tesla app opens successfully', () => {
    beforeEach(async () => {
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openTeslaApp(fallbackUrl);
    });

    it('should open the Tesla app directly', () => {
      expect((Linking.openURL as jest.Mock).mock.calls).toStrictEqual([['tesla://']]);
    });
  });

  describe('When the Tesla app cannot be opened', () => {
    beforeEach(async () => {
      (Linking.openURL as jest.Mock)
        .mockRejectedValueOnce(new Error('Tesla app unavailable'))
        .mockResolvedValueOnce(true);

      await openTeslaApp(fallbackUrl);
    });

    it('should open the fallback without retrying the deep link', () => {
      expect((Linking.openURL as jest.Mock).mock.calls).toStrictEqual([
        ['tesla://'],
        ['https://api.sentryguard.org/redirect/tesla-app?userId=user-123&lang=fr&skipDeepLink=true'],
      ]);
    });
  });

  describe('When neither the Tesla app nor the fallback can be opened', () => {
    let act: () => Promise<void>;

    beforeEach(() => {
      (Linking.openURL as jest.Mock).mockRejectedValue(new Error('nothing handles the url'));
      act = () => openTeslaApp(fallbackUrl);
    });

    it('should resolve without throwing', async () => {
      await expect(act()).resolves.toBeUndefined();
    });
  });
  describe('When the camera deep link is configured and the alert carries a VIN', () => {
    beforeEach(async () => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = fakeCameraTemplate;
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openTeslaApp(fallbackUrl, fakeVin);
    });

    it('should open the sentry camera view of that vehicle', () => {
      expect((Linking.openURL as jest.Mock).mock.calls).toStrictEqual([
        ['tesla://camera-view/5YJ3E1EA7KF000316'],
      ]);
    });
  });

  describe('When the camera deep link cannot be opened', () => {
    beforeEach(async () => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = fakeCameraTemplate;
      (Linking.openURL as jest.Mock)
        .mockRejectedValueOnce(new Error('camera view unavailable'))
        .mockResolvedValueOnce(true);

      await openTeslaApp(fallbackUrl, fakeVin);
    });

    it('should fall back to the Tesla app home screen', () => {
      expect((Linking.openURL as jest.Mock).mock.calls).toStrictEqual([
        ['tesla://camera-view/5YJ3E1EA7KF000316'],
        ['tesla://'],
      ]);
    });
  });

  describe('When the camera deep link is configured but the alert carries no VIN', () => {
    beforeEach(async () => {
      process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE = fakeCameraTemplate;
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openTeslaApp(fallbackUrl);
    });

    it('should open the Tesla app home screen', () => {
      expect((Linking.openURL as jest.Mock).mock.calls).toStrictEqual([['tesla://']]);
    });
  });

  describe('When the camera deep link is not configured', () => {
    beforeEach(async () => {
      delete process.env.EXPO_PUBLIC_TESLA_CAMERA_DEEP_LINK_TEMPLATE;
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openTeslaApp(fallbackUrl, fakeVin);
    });

    it('should open the Tesla app home screen', () => {
      expect((Linking.openURL as jest.Mock).mock.calls).toStrictEqual([['tesla://']]);
    });
  });
});

describe('The buildFallbackUrl() function', () => {
  describe('When the URL already contains query parameters', () => {
    it('should preserve them and disable the deep link retry', () => {
      expect(buildFallbackUrl('https://api.sentryguard.org/redirect/tesla-app?lang=en')).toBe(
        'https://api.sentryguard.org/redirect/tesla-app?lang=en&skipDeepLink=true'
      );
    });
  });

  describe('When the URL is malformed', () => {
    it('should return it unchanged instead of throwing', () => {
      expect(buildFallbackUrl('not a url')).toBe('not a url');
    });
  });
});
