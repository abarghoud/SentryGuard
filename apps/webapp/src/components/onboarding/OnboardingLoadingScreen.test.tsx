import { render, screen } from '@testing-library/react';
import OnboardingLoadingScreen from './OnboardingLoadingScreen';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('The OnboardingLoadingScreen component', () => {
  describe('When rendered', () => {
    it('should display loading spinner', () => {
      const { container } = render(<OnboardingLoadingScreen />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display loading text', () => {
      render(<OnboardingLoadingScreen />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});