import { render, screen } from '@testing-library/react';
import OnboardingSuccessScreen from './OnboardingSuccessScreen';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('The OnboardingSuccessScreen component', () => {
  describe('When rendered', () => {
    it('should display success icon', () => {
      const { container } = render(<OnboardingSuccessScreen />);

      const successIcon = container.querySelector('svg');
      expect(successIcon).toBeInTheDocument();
    });

    it('should display success title', () => {
      render(<OnboardingSuccessScreen />);

      expect(screen.getByText('Setup Complete!')).toBeInTheDocument();
    });

    it('should display success message', () => {
      render(<OnboardingSuccessScreen />);

      expect(
        screen.getByText(
          'Your SentryGuard is now fully configured. You will receive instant Telegram alerts when suspicious activity is detected.'
        )
      ).toBeInTheDocument();
    });

    it('should display dashboard link', () => {
      render(<OnboardingSuccessScreen />);

      const link = screen.getByRole('link', { name: /go to dashboard/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });
});