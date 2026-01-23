import { render, screen, fireEvent } from '@testing-library/react';
import SkipOnboardingButton from './SkipOnboardingButton';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('The SkipOnboardingButton component', () => {
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When enabled', () => {
    it('should render the skip button', () => {
      render(<SkipOnboardingButton disabled={false} onSkip={mockOnSkip} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should display skip text', () => {
      render(<SkipOnboardingButton disabled={false} onSkip={mockOnSkip} />);

      expect(screen.getByText('Skip for now')).toBeInTheDocument();
    });

    it('should call onSkip when clicked', () => {
      render(<SkipOnboardingButton disabled={false} onSkip={mockOnSkip} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnSkip).toHaveBeenCalled();
    });

    it('should not be disabled', () => {
      render(<SkipOnboardingButton disabled={false} onSkip={mockOnSkip} />);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('When disabled', () => {
    it('should display skipping text', () => {
      render(<SkipOnboardingButton disabled={true} onSkip={mockOnSkip} />);

      expect(screen.getByText('Skipping...')).toBeInTheDocument();
    });

    it('should be disabled', () => {
      render(<SkipOnboardingButton disabled={true} onSkip={mockOnSkip} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not call onSkip when clicked', () => {
      render(<SkipOnboardingButton disabled={true} onSkip={mockOnSkip} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnSkip).not.toHaveBeenCalled();
    });
  });
});