import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mock, MockProxy } from 'jest-mock-extended';
import { createUseOnboardingQuery } from './use-onboarding-query';
import { hasToken } from '../../../../core/api/token-manager';
import {
  GetOnboardingStatusRequirements,
  CompleteOnboardingRequirements,
  SkipOnboardingRequirements,
} from '../../domain/use-cases/onboarding.use-cases.requirements';
import React from 'react';

jest.mock('../../../../core/api/token-manager', () => ({
  hasToken: jest.fn(),
}));

let mockGetOnboardingStatusUseCase: MockProxy<GetOnboardingStatusRequirements>;
let mockCompleteOnboardingUseCase: MockProxy<CompleteOnboardingRequirements>;
let mockSkipOnboardingUseCase: MockProxy<SkipOnboardingRequirements>;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('The useOnboardingQuery() hook', () => {
  let useOnboardingQuery: ReturnType<typeof createUseOnboardingQuery>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOnboardingStatusUseCase = mock<GetOnboardingStatusRequirements>();
    mockCompleteOnboardingUseCase = mock<CompleteOnboardingRequirements>();
    mockSkipOnboardingUseCase = mock<SkipOnboardingRequirements>();
    
    useOnboardingQuery = createUseOnboardingQuery({
      getOnboardingStatusUseCase: mockGetOnboardingStatusUseCase,
      completeOnboardingUseCase: mockCompleteOnboardingUseCase,
      skipOnboardingUseCase: mockSkipOnboardingUseCase,
    });
  });

  describe('When querying onboarding status', () => {
    describe('When the user has no token', () => {
      beforeEach(() => {
        (hasToken as jest.Mock).mockReturnValue(false);
      });

      it('should return null without calling the use case', async () => {
        const { result } = renderHook(() => useOnboardingQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.query.data).toBeNull();
        expect(mockGetOnboardingStatusUseCase.execute).not.toHaveBeenCalled();
      });
    });

    describe('When the user has a token', () => {
      beforeEach(() => {
        (hasToken as jest.Mock).mockReturnValue(true);
      });

      it('should return the onboarding status from the use case', async () => {
        const expectedStatus = { isComplete: true };
        mockGetOnboardingStatusUseCase.execute.mockResolvedValue(expectedStatus);

        const { result } = renderHook(() => useOnboardingQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.query.data).toEqual(expectedStatus);
        expect(mockGetOnboardingStatusUseCase.execute).toHaveBeenCalled();
      });
    });
  });

  describe('When completing onboarding', () => {
    describe('When the mutation succeeds', () => {
      it('should return the success result', async () => {
        const expectedResult = { success: true };
        mockCompleteOnboardingUseCase.execute.mockResolvedValue(expectedResult);

        const { result } = renderHook(() => useOnboardingQuery(), { wrapper });
        const response = await result.current.completeOnboardingMutation.mutateAsync();

        expect(response).toEqual(expectedResult);
        expect(mockCompleteOnboardingUseCase.execute).toHaveBeenCalled();
      });
    });

    describe('When the mutation fails', () => {
      it('should throw an error', async () => {
        const expectedError = 'Failed to complete onboarding';
        mockCompleteOnboardingUseCase.execute.mockResolvedValue({ success: false });

        const { result } = renderHook(() => useOnboardingQuery(), { wrapper });

        await expect(result.current.completeOnboardingMutation.mutateAsync()).rejects.toThrow(expectedError);
      });
    });
  });

  describe('When skipping onboarding', () => {
    describe('When the mutation succeeds', () => {
      it('should return the success result', async () => {
        const expectedResult = { success: true };
        mockSkipOnboardingUseCase.execute.mockResolvedValue(expectedResult);

        const { result } = renderHook(() => useOnboardingQuery(), { wrapper });
        const response = await result.current.skipOnboardingMutation.mutateAsync();

        expect(response).toEqual(expectedResult);
        expect(mockSkipOnboardingUseCase.execute).toHaveBeenCalled();
      });
    });

    describe('When the mutation fails', () => {
      it('should throw an error', async () => {
        const expectedError = 'Failed to skip onboarding';
        mockSkipOnboardingUseCase.execute.mockResolvedValue({ success: false });

        const { result } = renderHook(() => useOnboardingQuery(), { wrapper });

        await expect(result.current.skipOnboardingMutation.mutateAsync()).rejects.toThrow(expectedError);
      });
    });
  });
});
