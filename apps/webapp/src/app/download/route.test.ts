/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('The download route handler', () => {
  const originalEnvironment = { ...process.env };

  const createRequest = (headers: Record<string, string>) =>
    new NextRequest('https://sentryguard.org/download', { headers });

  beforeEach(() => {
    process.env = { ...originalEnvironment };
    process.env.NEXT_PUBLIC_APP_STORE_URL = 'https://apps.apple.com/app/sentryguard';
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL =
      'https://play.google.com/store/apps/details?id=org.sentryguard';
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  describe('When requested from an iPhone', () => {
    it('should redirect to the App Store', async () => {
      const request = createRequest({
        'user-agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(
        'https://apps.apple.com/app/sentryguard'
      );
    });
  });

  describe('When requested from an iPad', () => {
    it('should redirect to the App Store', async () => {
      const request = createRequest({
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const response = await GET(request);

      expect(response.headers.get('location')).toBe(
        'https://apps.apple.com/app/sentryguard'
      );
    });
  });

  describe('When requested from an Android device', () => {
    it('should redirect to Google Play', async () => {
      const request = createRequest({
        'user-agent':
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0',
      });

      const response = await GET(request);

      expect(response.headers.get('location')).toBe(
        'https://play.google.com/store/apps/details?id=org.sentryguard'
      );
    });
  });

  describe('When requested from a desktop browser', () => {
    it('should redirect to the English download section', async () => {
      const request = createRequest({
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      });

      const response = await GET(request);

      expect(response.headers.get('location')).toBe(
        'https://sentryguard.org/en#mobile-app'
      );
    });
  });

  describe('When requested with French language preference', () => {
    it('should redirect to the French download section', async () => {
      const request = createRequest({
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0',
        'accept-language': 'fr-FR,fr;q=0.9',
      });

      const response = await GET(request);

      expect(response.headers.get('location')).toBe(
        'https://sentryguard.org/fr#mobile-app'
      );
    });
  });

  describe('When the App Store URL is not configured', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_APP_STORE_URL;
    });

    it('should not redirect iPhone users to the App Store', async () => {
      const request = createRequest({
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      });

      const response = await GET(request);

      expect(response.headers.get('location')).toBe(
        'https://sentryguard.org/en#mobile-app'
      );
    });
  });

  describe('When the Google Play URL is not configured', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL;
    });

    it('should not redirect Android users to Google Play', async () => {
      const request = createRequest({
        'user-agent':
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0',
      });

      const response = await GET(request);

      expect(response.headers.get('location')).toBe(
        'https://sentryguard.org/en#mobile-app'
      );
    });
  });
});
