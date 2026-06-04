import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeatureDiscoveryStep from './FeatureDiscoveryStep';
import { useOnboardingQuery } from '../../features/onboarding/di';

jest.mock('../../features/onboarding/di');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseOnboardingQuery = useOnboardingQuery as jest.Mock;

interface Props {
  announcementKey: string;
  onDismissed: () => Promise<void>;
}

const renderComponent = (props: Partial<Props> = {}) => {
  const defaultProps: Props = {
    announcementKey: 'break_in_offensive_response_v1',
    onDismissed: jest.fn(),
  };
  return render(<FeatureDiscoveryStep {...defaultProps} {...props} />);
};

describe('The FeatureDiscoveryStep component', () => {
  const mockDismissAnnouncement = jest.fn();
  const mockOnDismissed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseOnboardingQuery.mockReturnValue({
      dismissAnnouncementMutation: {
        mutateAsync: mockDismissAnnouncement,
      },
    });
  });

  describe('When announcement key is break_in_offensive_response_v1', () => {
    describe('When rendering', () => {
      beforeEach(() => {
        renderComponent({
          announcementKey: 'break_in_offensive_response_v1',
          onDismissed: mockOnDismissed,
        });
      });

      it('should render the announcement header', () => {
        expect(screen.getByText('New features available')).toBeInTheDocument();
      });

      it('should render the break-in monitoring details', () => {
        expect(screen.getByText('Break-in Monitoring')).toBeInTheDocument();
      });

      it('should render the offensive response details', () => {
        expect(screen.getByText('Offensive Response (Horn)')).toBeInTheDocument();
      });
    });

    describe('When clicking the dismiss button', () => {
      beforeEach(async () => {
        mockDismissAnnouncement.mockResolvedValue({});
        renderComponent({
          announcementKey: 'break_in_offensive_response_v1',
          onDismissed: mockOnDismissed,
        });

        fireEvent.click(screen.getByRole('button', { name: "Understood, let's go!" }));

        await waitFor(() => {
          expect(mockDismissAnnouncement).toHaveBeenCalled();
        });
      });

      it('should call dismissAnnouncementMutation with the key', () => {
        expect(mockDismissAnnouncement).toHaveBeenCalledWith('break_in_offensive_response_v1');
      });

      it('should call onDismissed', () => {
        expect(mockOnDismissed).toHaveBeenCalled();
      });
    });
  });

  describe('When announcement key is unknown', () => {
    describe('When checking render output', () => {
      let container: HTMLElement;

      beforeEach(async () => {
        mockDismissAnnouncement.mockResolvedValue({});
        const renderResult = renderComponent({
          announcementKey: 'unknown_key',
          onDismissed: mockOnDismissed,
        });
        container = renderResult.container;

        await waitFor(() => {
          expect(mockDismissAnnouncement).toHaveBeenCalled();
        });
      });

      it('should render null', () => {
        expect(container.firstChild).toBeNull();
      });
    });

    describe('When auto-dismissing successfully', () => {
      beforeEach(async () => {
        mockDismissAnnouncement.mockResolvedValue({});
        renderComponent({
          announcementKey: 'unknown_key',
          onDismissed: mockOnDismissed,
        });

        await waitFor(() => {
          expect(mockDismissAnnouncement).toHaveBeenCalled();
        });
      });

      it('should automatically call dismissAnnouncementMutation with the unknown key', () => {
        expect(mockDismissAnnouncement).toHaveBeenCalledWith('unknown_key');
      });

      it('should call onDismissed', () => {
        expect(mockOnDismissed).toHaveBeenCalled();
      });
    });

    describe('When auto-dismissing fails', () => {
      let consoleError: jest.SpyInstance;

      beforeEach(async () => {
        consoleError = jest.spyOn(console, 'error').mockImplementation();
        mockDismissAnnouncement.mockRejectedValue(new Error('Dismiss failed'));
        renderComponent({
          announcementKey: 'unknown_key',
          onDismissed: mockOnDismissed,
        });

        await waitFor(() => {
          expect(mockOnDismissed).toHaveBeenCalled();
        });
      });

      afterEach(() => {
        consoleError.mockRestore();
      });

      it('should still call onDismissed to prevent locking the UI', () => {
        expect(mockOnDismissed).toHaveBeenCalled();
      });
    });
  });
});
