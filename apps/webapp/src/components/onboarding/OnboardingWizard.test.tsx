import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import OnboardingWizard from './OnboardingWizard';
import { OnboardingStep } from '../../features/onboarding/domain/entities';
import { useOnboardingQuery } from '../../features/onboarding/di';
import { useOnboardingStep } from '../../features/onboarding/presentation/hooks/use-onboarding-step';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../features/onboarding/di');
jest.mock('../../features/onboarding/presentation/hooks/use-onboarding-step');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseOnboardingQuery = useOnboardingQuery as jest.Mock;
const mockUseOnboardingStep = useOnboardingStep as jest.MockedFunction<typeof useOnboardingStep>;

jest.mock('./TelegramLinkStep', () => ({
  __esModule: true,
  default: ({ onContinue }: { onContinue: () => void }) => (
    <div data-testid="telegram-link-step">
      <button onClick={onContinue}>Continue from Telegram</button>
    </div>
  ),
}));

jest.mock('./VirtualKeySetupStep', () => ({
  __esModule: true,
  default: ({ onContinue }: { onContinue: () => void }) => (
    <div data-testid="virtual-key-setup-step">
      <button onClick={onContinue}>Continue from Virtual Key Setup</button>
    </div>
  ),
}));

jest.mock('./TelemetryActivationStep', () => ({
  __esModule: true,
  default: ({ onCompleted }: { onCompleted: () => void }) => (
    <div data-testid="telemetry-activation-step">
      <button onClick={onCompleted}>Complete Telemetry</button>
    </div>
  ),
}));

jest.mock('./OnboardingLoadingScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-screen">Loading...</div>,
}));

jest.mock('./OnboardingSuccessScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="success-screen">Success!</div>,
}));

jest.mock('./SkipOnboardingButton', () => ({
  __esModule: true,
  default: ({ onSkip }: { onSkip: () => void }) => (
    <button data-testid="skip-button" onClick={onSkip}>
      Skip for now
    </button>
  ),
}));

jest.mock('./OnboardingWizardHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="wizard-header">Header</div>,
}));

describe('The OnboardingWizard component', () => {
  const mockPush = jest.fn();
  const mockSkipOnboarding = jest.fn();
  const mockCheckStatus = jest.fn();
  const mockRefreshAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);

    mockUseOnboardingQuery.mockReturnValue({
      query: {
        data: { isComplete: false },
        isLoading: false,
        refetch: mockCheckStatus,
      },
      skipOnboardingMutation: {
        mutateAsync: mockSkipOnboarding,
      },
    });

    mockUseOnboardingStep.mockReturnValue({
      currentStep: OnboardingStep.TELEGRAM_LINK,
      isTelegramLinked: false,
      isVirtualKeyPaired: false,
      refreshAll: mockRefreshAll,
      isLoading: false,
    });
  });

  describe('When onboarding is loading', () => {
    beforeEach(() => {
      mockUseOnboardingQuery.mockReturnValue({
        query: {
          data: { isComplete: false },
          isLoading: true,
          refetch: mockCheckStatus,
        },
        skipOnboardingMutation: {
          mutateAsync: mockSkipOnboarding,
        },
      });
    });

    it('should display loading screen', () => {
      render(<OnboardingWizard />);

      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    });
  });

  describe('When onboarding step is loading', () => {
    beforeEach(() => {
      mockUseOnboardingStep.mockReturnValue({
        currentStep: OnboardingStep.TELEGRAM_LINK,
        isTelegramLinked: false,
        isVirtualKeyPaired: false,
        refreshAll: mockRefreshAll,
        isLoading: true,
      });
    });

    it('should display loading screen', () => {
      render(<OnboardingWizard />);

      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    });
  });

  describe('When onboarding is complete', () => {
    beforeEach(() => {
      mockUseOnboardingQuery.mockReturnValue({
        query: {
          data: { isComplete: true },
          isLoading: false,
          refetch: mockCheckStatus,
        },
        skipOnboardingMutation: {
          mutateAsync: mockSkipOnboarding,
        },
      });
    });

    it('should display success screen', () => {
      render(<OnboardingWizard />);

      expect(screen.getByTestId('success-screen')).toBeInTheDocument();
    });

    it('should redirect to dashboard after delay', async () => {
      render(<OnboardingWizard />);

      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalledWith('/dashboard');
        },
        { timeout: 3000 }
      );
    });
  });

  describe('When on telegram link step', () => {
    beforeEach(() => {
      mockUseOnboardingStep.mockReturnValue({
        currentStep: OnboardingStep.TELEGRAM_LINK,
        isTelegramLinked: false,
        isVirtualKeyPaired: false,
        refreshAll: mockRefreshAll,
        isLoading: false,
      });
    });

    it('should display telegram link step', () => {
      render(<OnboardingWizard />);

      expect(screen.getByTestId('telegram-link-step')).toBeInTheDocument();
    });

    it('should display skip button', () => {
      render(<OnboardingWizard />);

      expect(screen.getByTestId('skip-button')).toBeInTheDocument();
    });

    it('should call refresh functions when continue is clicked', async () => {
      render(<OnboardingWizard />);

      fireEvent.click(screen.getByText('Continue from Telegram'));

      await waitFor(() => {
        expect(mockCheckStatus).toHaveBeenCalled();
        expect(mockRefreshAll).toHaveBeenCalled();
      });
    });
  });

  describe('When on virtual key setup step', () => {
    beforeEach(() => {
      mockUseOnboardingStep.mockReturnValue({
        currentStep: OnboardingStep.VIRTUAL_KEY_SETUP,
        isTelegramLinked: true,
        isVirtualKeyPaired: false,
        refreshAll: mockRefreshAll,
        isLoading: false,
      });
    });

    it('should display virtual key setup step', () => {
      render(<OnboardingWizard />);

      expect(screen.getByTestId('virtual-key-setup-step')).toBeInTheDocument();
    });
  });

  describe('When on telemetry activation step', () => {
    beforeEach(() => {
      mockUseOnboardingStep.mockReturnValue({
        currentStep: OnboardingStep.TELEMETRY_ACTIVATION,
        isTelegramLinked: true,
        isVirtualKeyPaired: true,
        refreshAll: mockRefreshAll,
        isLoading: false,
      });
    });

    it('should display telemetry activation step', () => {
      render(<OnboardingWizard />);

      expect(screen.getByTestId('telemetry-activation-step')).toBeInTheDocument();
    });
  });

  describe('When skip button is clicked', () => {
    beforeEach(() => {
      mockSkipOnboarding.mockResolvedValue({ success: true });
    });

    it('should call skipOnboarding', async () => {
      render(<OnboardingWizard />);

      fireEvent.click(screen.getByTestId('skip-button'));

      await waitFor(() => {
        expect(mockSkipOnboarding).toHaveBeenCalled();
      });
    });

    it('should handle skip failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSkipOnboarding.mockRejectedValue(new Error('Skip failed'));

      render(<OnboardingWizard />);

      fireEvent.click(screen.getByTestId('skip-button'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to skip onboarding:', 'Skip failed');
      });

      consoleError.mockRestore();
    });
  });

  describe('When wizard header is rendered', () => {
    it('should display wizard header', () => {
      render(<OnboardingWizard />);

      expect(screen.getByTestId('wizard-header')).toBeInTheDocument();
    });
  });
});