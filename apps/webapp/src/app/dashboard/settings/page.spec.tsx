import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SettingsPage from './page';
import { useAuth } from '../../../lib/useAuth';
import { useConsent } from '../../../lib/useConsent';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../../lib/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../lib/useConsent', () => ({
  useConsent: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('The SettingsPage component', () => {
  const mockPush = jest.fn();
  const mockLogout = jest.fn();
  const mockRevokeConsent = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useAuth as jest.Mock).mockReturnValue({
      profile: {
        full_name: 'John Doe',
        email: 'john@example.com',
      },
      logout: mockLogout,
    });

    (useConsent as jest.Mock).mockReturnValue({
      revokeConsent: mockRevokeConsent,
    });

    jest.clearAllMocks();
    window.confirm = jest.fn();
  });

  describe('When rendering the page', () => {
    beforeEach(() => {
      render(<SettingsPage />);
    });

    it('should display settings header', () => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should display account information section', () => {
      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });

    it('should display user name', () => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user email', () => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display danger zone section', () => {
      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    });

    it('should display delete account button', () => {
      expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument();
    });

    it('should display back to dashboard button', () => {
      expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument();
    });
  });

  describe('When profile has no name', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: {
          email: 'john@example.com',
        },
        logout: mockLogout,
      });

      render(<SettingsPage />);
    });

    it('should not display name field', () => {
      expect(screen.queryByText('Name')).not.toBeInTheDocument();
    });

    it('should still display email', () => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('When clicking back to dashboard button', () => {
    beforeEach(() => {
      render(<SettingsPage />);
      const backButton = screen.getByText(/Back to Dashboard/i);
      fireEvent.click(backButton);
    });

    it('should navigate to dashboard', () => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('When clicking delete account button', () => {
    describe('When user confirms deletion', () => {
      describe('When revoke consent succeeds', () => {
        beforeEach(async () => {
          (window.confirm as jest.Mock).mockReturnValue(true);
          mockRevokeConsent.mockResolvedValue(true);

          render(<SettingsPage />);
          const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
          fireEvent.click(deleteButton);

          await waitFor(() => {
            expect(mockRevokeConsent).toHaveBeenCalled();
          });
        });

        it('should show confirmation dialog', () => {
          expect(window.confirm).toHaveBeenCalledWith('Delete account confirmation');
        });

        it('should call revokeConsent', () => {
          expect(mockRevokeConsent).toHaveBeenCalled();
        });

        it('should log out user', () => {
          expect(mockLogout).toHaveBeenCalled();
        });

        it('should navigate to home page', () => {
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      });

      describe('When revoke consent fails', () => {
        beforeEach(async () => {
          (window.confirm as jest.Mock).mockReturnValue(true);
          mockRevokeConsent.mockResolvedValue(false);

          render(<SettingsPage />);
          const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
          fireEvent.click(deleteButton);

          await waitFor(() => {
            expect(mockRevokeConsent).toHaveBeenCalled();
          });
        });

        it('should not log out user', () => {
          expect(mockLogout).not.toHaveBeenCalled();
        });

        it('should not navigate away', () => {
          expect(mockPush).not.toHaveBeenCalled();
        });
      });
    });

    describe('When user cancels deletion', () => {
      beforeEach(() => {
        (window.confirm as jest.Mock).mockReturnValue(false);

        render(<SettingsPage />);
        const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
        fireEvent.click(deleteButton);
      });

      it('should not call revokeConsent', () => {
        expect(mockRevokeConsent).not.toHaveBeenCalled();
      });

      it('should not log out user', () => {
        expect(mockLogout).not.toHaveBeenCalled();
      });

      it('should not navigate away', () => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });
});
