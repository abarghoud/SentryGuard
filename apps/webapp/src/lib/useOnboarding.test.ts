import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnboarding } from './useOnboarding';
import * as api from './api';

jest.mock('./api');

const mockApi = api as jest.Mocked<typeof api>;

describe('The useOnboarding() hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When initialized', () => {
    describe('When user has token', () => {
      beforeEach(() => {
        mockApi.hasToken.mockReturnValue(true);
        mockApi.getOnboardingStatus.mockResolvedValue({
          isComplete: false,
        });
      });

      it('should start with loading state', () => {
        const { result } = renderHook(() => useOnboarding());

        expect(result.current.isLoading).toBe(true);
      });

      it('should fetch onboarding status', async () => {
        renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(mockApi.getOnboardingStatus).toHaveBeenCalled();
        });
      });

      it('should set status from API', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isComplete).toBe(false);
          expect(result.current.isLoading).toBe(false);
        });
      });
    });

    describe('When user has no token', () => {
      beforeEach(() => {
        mockApi.hasToken.mockReturnValue(false);
      });

      it('should not fetch status', async () => {
        renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(mockApi.getOnboardingStatus).not.toHaveBeenCalled();
        });
      });

      it('should set loading to false', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      });
    });
  });

  describe('The completeOnboarding() function', () => {
    describe('When onboarding is completed successfully', () => {
      beforeEach(() => {
        mockApi.hasToken.mockReturnValue(true);
        mockApi.getOnboardingStatus.mockResolvedValue({
          isComplete: false,
        });
        mockApi.completeOnboarding.mockResolvedValue({ success: true });
      });

      it('should call the API', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.completeOnboarding();
        });

        expect(mockApi.completeOnboarding).toHaveBeenCalled();
      });

      it('should update isComplete to true', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.completeOnboarding();
        });

        await waitFor(() => {
          expect(result.current.isComplete).toBe(true);
        });
      });

      it('should return success response', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        let response: any;
        await act(async () => {
          response = await result.current.completeOnboarding();
        });

        expect(response).toStrictEqual({ success: true });
      });
    });

    describe('When API throws an error', () => {
      const expectedError = 'Failed to complete onboarding';

      beforeEach(() => {
        mockApi.hasToken.mockReturnValue(true);
        mockApi.getOnboardingStatus.mockResolvedValue({
          isComplete: false,
        });
        const error = new Error(expectedError);
        error.name = 'ApiError';
        (error as any).statusCode = 400;
        mockApi.completeOnboarding.mockRejectedValue(error);
      });

      it('should set error state', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.completeOnboarding();
        });

        await waitFor(() => {
          expect(result.current.error).toBe(expectedError);
        });
      });

      it('should return error response', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        let response: any;
        await act(async () => {
          response = await result.current.completeOnboarding();
        });

        expect(response.success).toBe(false);
        expect(response.error).toBe(expectedError);
      });
    });
  });

  describe('The skipOnboarding() function', () => {
    describe('When onboarding is skipped successfully', () => {
      beforeEach(() => {
        mockApi.hasToken.mockReturnValue(true);
        mockApi.getOnboardingStatus.mockResolvedValue({
          isComplete: false,
        });
        mockApi.skipOnboarding.mockResolvedValue({ success: true });
      });

      it('should call the API', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.skipOnboarding();
        });

        expect(mockApi.skipOnboarding).toHaveBeenCalled();
      });

      it('should update isComplete to true', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.skipOnboarding();
        });

        await waitFor(() => {
          expect(result.current.isComplete).toBe(true);
        });
      });

      it('should return success response', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        let response: any;
        await act(async () => {
          response = await result.current.skipOnboarding();
        });

        expect(response).toStrictEqual({ success: true });
      });
    });

    describe('When API throws an error', () => {
      const expectedError = 'Failed to skip onboarding';

      beforeEach(() => {
        mockApi.hasToken.mockReturnValue(true);
        mockApi.getOnboardingStatus.mockResolvedValue({
          isComplete: false,
        });
        mockApi.skipOnboarding.mockRejectedValue(new Error(expectedError));
      });

      it('should set error state', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.skipOnboarding();
        });

        await waitFor(() => {
          expect(result.current.error).toBe(expectedError);
        });
      });

      it('should return error response', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        let response: any;
        await act(async () => {
          response = await result.current.skipOnboarding();
        });

        expect(response.success).toBe(false);
        expect(response.error).toBe(expectedError);
      });
    });
  });

  describe('The checkStatus() function', () => {
    describe('When called', () => {
      beforeEach(() => {
        mockApi.hasToken.mockReturnValue(true);
        mockApi.getOnboardingStatus.mockResolvedValue({
          isComplete: true,
        });
      });

      it('should fetch updated status', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        mockApi.getOnboardingStatus.mockClear();
        mockApi.getOnboardingStatus.mockResolvedValue({
          isComplete: true,
        });

        await act(async () => {
          await result.current.checkStatus();
        });

        expect(mockApi.getOnboardingStatus).toHaveBeenCalled();
      });

      it('should update state with new status', async () => {
        const { result } = renderHook(() => useOnboarding());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        mockApi.getOnboardingStatus.mockResolvedValue({
          isComplete: true,
        });

        await act(async () => {
          await result.current.checkStatus();
        });

        expect(result.current.isComplete).toBe(true);
      });
    });
  });
});