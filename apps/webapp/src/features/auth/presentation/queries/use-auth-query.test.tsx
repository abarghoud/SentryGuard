import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mock, MockProxy } from 'jest-mock-extended';
import { createUseAuthQuery } from './use-auth-query';
import { getToken, clearToken } from '../../../../core/api/token-manager';
import { ApiError } from '../../../../core/api/api-client';
import {
  CheckAuthStatusRequirements,
  GetUserProfileRequirements,
  LogoutRequirements,
} from '../../domain/use-cases/auth.use-cases.requirements';
import { UserProfile } from '../../domain/entities';
import React from 'react';

jest.mock('../../../../core/api/token-manager', () => ({
  getToken: jest.fn(),
  clearToken: jest.fn(),
}));

let mockCheckAuthStatusUseCase!: MockProxy<CheckAuthStatusRequirements>;
let mockGetUserProfileUseCase!: MockProxy<GetUserProfileRequirements>;
let mockLogoutUseCase!: MockProxy<LogoutRequirements>;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('The useAuthQuery() hook', () => {
  let useAuthQuery: ReturnType<typeof createUseAuthQuery>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckAuthStatusUseCase = mock<CheckAuthStatusRequirements>();
    mockGetUserProfileUseCase = mock<GetUserProfileRequirements>();
    mockLogoutUseCase = mock<LogoutRequirements>();
    
    useAuthQuery = createUseAuthQuery({
      checkAuthStatusUseCase: mockCheckAuthStatusUseCase,
      getUserProfileUseCase: mockGetUserProfileUseCase,
      logoutUseCase: mockLogoutUseCase,
    });
  });

  describe('When the token is valid', () => {
    it('should return the authenticated status', async () => {
      (getToken as jest.Mock).mockReturnValue('valid-token');
      mockCheckAuthStatusUseCase.execute.mockResolvedValue({ authenticated: true, userId: '123', message: '' });
      mockGetUserProfileUseCase.execute.mockResolvedValue({ email: 'test@example.com', full_name: 'Test User' } as unknown as UserProfile);

      const { result } = renderHook(() => useAuthQuery(), { wrapper });

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      expect(result.current.query.data?.status).toEqual({ authenticated: true, userId: '123', message: '' });
    });

    it('should return the user profile', async () => {
      (getToken as jest.Mock).mockReturnValue('valid-token');
      mockCheckAuthStatusUseCase.execute.mockResolvedValue({ authenticated: true, userId: '123', message: '' });
      mockGetUserProfileUseCase.execute.mockResolvedValue({ email: 'test@example.com', full_name: 'Test User' } as unknown as UserProfile);

      const { result } = renderHook(() => useAuthQuery(), { wrapper });

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      expect(result.current.query.data?.profile).toEqual({ email: 'test@example.com', full_name: 'Test User' });
    });
  });

  describe('When the authentication fails with 401 Unauthorized', () => {
    const expectedError = new ApiError('Unauthorized', 401);

    beforeEach(() => {
      (getToken as jest.Mock).mockReturnValue('expired-token');
      mockCheckAuthStatusUseCase.execute.mockRejectedValue(expectedError);
    });

    it('should clear the token from storage', async () => {
      const { result } = renderHook(() => useAuthQuery(), { wrapper });

      await waitFor(() => expect(result.current.query.isError).toBe(true));

      expect(clearToken).toHaveBeenCalled();
    });

    it('should return the authentication error', async () => {
      const { result } = renderHook(() => useAuthQuery(), { wrapper });

      await waitFor(() => expect(result.current.query.isError).toBe(true));

      expect(result.current.query.error).toBe(expectedError);
    });
  });

  describe('When a server error occurs (500)', () => {
    const expectedError = new ApiError('Server Error', 500);

    beforeEach(() => {
      (getToken as jest.Mock).mockReturnValue('valid-token');
      mockCheckAuthStatusUseCase.execute.mockRejectedValue(expectedError);
    });

    it('should NOT clear the token from storage', async () => {
      const { result } = renderHook(() => useAuthQuery(), { wrapper });

      await waitFor(() => expect(result.current.query.isError).toBe(true));

      expect(clearToken).not.toHaveBeenCalled();
    });
  });

  describe('When the logout mutation is called', () => {
    it('should execute the logout use case', async () => {
      mockLogoutUseCase.execute.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuthQuery(), { wrapper });

      await result.current.logoutMutation.mutateAsync();

      expect(mockLogoutUseCase.execute).toHaveBeenCalled();
    });

    it('should clear the token from storage after logout', async () => {
      mockLogoutUseCase.execute.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuthQuery(), { wrapper });

      await result.current.logoutMutation.mutateAsync();

      expect(clearToken).toHaveBeenCalled();
    });
  });
});
