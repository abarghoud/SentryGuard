import React from 'react';
import { render, screen } from '@testing-library/react';
import { StoreBadges } from './StoreBadges';

describe('The StoreBadges component', () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnvironment };
    delete process.env.NEXT_PUBLIC_APP_STORE_URL;
    delete process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL;
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  describe('When no store URL is configured', () => {
    it('should render nothing', () => {
      const { container } = render(<StoreBadges />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('When only the App Store URL is configured', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_STORE_URL = 'https://apps.apple.com/app/sentryguard';
      render(<StoreBadges />);
    });

    it('should render the App Store badge link with the configured URL', () => {
      const link = screen.getByRole('link', { name: 'Download on the App Store' });

      expect(link).toHaveAttribute(
        'href',
        'https://apps.apple.com/app/sentryguard'
      );
    });

    it('should open the link in a new tab', () => {
      const link = screen.getByRole('link', { name: 'Download on the App Store' });

      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not render the Google Play badge', () => {
      expect(screen.queryByAltText('Get it on Google Play')).not.toBeInTheDocument();
    });
  });

  describe('When only the Google Play URL is configured', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL =
        'https://play.google.com/store/apps/details?id=org.sentryguard';
      render(<StoreBadges />);
    });

    it('should render the Google Play badge link with the configured URL', () => {
      const link = screen.getByRole('link', { name: 'Get it on Google Play' });

      expect(link).toHaveAttribute(
        'href',
        'https://play.google.com/store/apps/details?id=org.sentryguard'
      );
    });

    it('should not render the App Store badge', () => {
      expect(screen.queryByAltText('Download on the App Store')).not.toBeInTheDocument();
    });
  });

  describe('When both store URLs are configured', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_STORE_URL = 'https://apps.apple.com/app/sentryguard';
      process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL =
        'https://play.google.com/store/apps/details?id=org.sentryguard';
      render(<StoreBadges />);
    });

    it('should render both badge links', () => {
      expect(screen.getByAltText('Download on the App Store')).toBeInTheDocument();
      expect(screen.getByAltText('Get it on Google Play')).toBeInTheDocument();
    });
  });
});
