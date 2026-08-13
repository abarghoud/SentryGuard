import { renderHook, act } from '@testing-library/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTeslaCallback } from './use-tesla-callback';
import { setToken, hasToken } from '../../core/api/token-manager';
import { apiClient } from '../../core/api';
import { getConsentStatusUseCase } from '../../features/consent/di';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('../../core/api/token-manager', () => ({
  setToken: jest.fn(),
  hasToken: jest.fn(),
}));

jest.mock('../../core/api', () => ({
  apiClient: { request: jest.fn() },
}));

jest.mock('../../features/consent/di', () => ({
  getConsentStatusUseCase: {
    execute: jest.fn(),
  },
}));

const mockT = (key: string) => key;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

describe('The useTeslaCallback() hook', () => {
  let mockRouter: { replace: jest.Mock };
  let mockSearchParams: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockRouter = { replace: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    mockSearchParams = { get: jest.fn() };
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

    window.location.hash = '';
    window.location.search = '';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('When Tesla returns a login cancelled error', () => {
    beforeEach(() => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'error') return 'login_cancelled';
        return null;
      });
    });

    it('should set status to cancelled', () => {
      const { result } = renderHook(() => useTeslaCallback());
      expect(result.current.status).toStrictEqual('cancelled');
    });
  });

  describe('When Tesla returns a missing permissions error', () => {
    beforeEach(() => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'error') return 'Missing required permissions: scope1, scope2';
        return null;
      });
    });

    it('should redirect to scopes-fix page with missing scopes', () => {
      renderHook(() => useTeslaCallback());
      expect(mockRouter.replace).toHaveBeenCalledWith('/scopes-fix?missing=scope1,scope2');
    });
  });

  describe('When Tesla returns a generic error', () => {
    beforeEach(() => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'error') return 'generic_error_code';
        return null;
      });
    });

    it('should set status to error', () => {
      const { result } = renderHook(() => useTeslaCallback());
      expect(result.current.status).toStrictEqual('error');
    });
  });

  describe('When the session exchange succeeds', () => {
    beforeEach(() => {
      (apiClient.request as jest.Mock).mockResolvedValue({ token: 'exchanged-jwt' });
      (hasToken as jest.Mock).mockReturnValue(true);
      (getConsentStatusUseCase.execute as jest.Mock).mockResolvedValue({ hasConsent: true });
    });

    it('should store the exchanged token', async () => {
      renderHook(() => useTeslaCallback());
      await act(async () => {
        await flushMicrotasks();
      });
      expect(setToken).toHaveBeenCalledWith('exchanged-jwt');
    });

    it('should call the exchange endpoint with credentials included', async () => {
      renderHook(() => useTeslaCallback());
      await act(async () => {
        await flushMicrotasks();
      });
      expect(apiClient.request).toHaveBeenCalledWith(
        '/auth/session/exchange',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
    });
  });

  describe('When the session exchange fails', () => {
    beforeEach(() => {
      (apiClient.request as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
      (hasToken as jest.Mock).mockReturnValue(false);
    });

    it('should set status to error', async () => {
      const { result } = renderHook(() => useTeslaCallback());
      await act(async () => {
        await flushMicrotasks();
      });
      expect(result.current.status).toStrictEqual('error');
    });
  });

  describe('When a token is found in the hash', () => {
    beforeEach(() => {
      window.location.hash = '#token=hash-jwt';
      (hasToken as jest.Mock).mockReturnValue(true);
      (getConsentStatusUseCase.execute as jest.Mock).mockResolvedValue({ hasConsent: true });
    });

    it('should store the token from hash', async () => {
      renderHook(() => useTeslaCallback());
      await act(async () => {
        await flushMicrotasks();
      });
      expect(setToken).toHaveBeenCalledWith('hash-jwt');
    });
  });

  describe('When authentication is successful and user has consent', () => {
    beforeEach(() => {
      (apiClient.request as jest.Mock).mockResolvedValue({ token: 'exchanged-jwt' });
      (hasToken as jest.Mock).mockReturnValue(true);
      (getConsentStatusUseCase.execute as jest.Mock).mockResolvedValue({ hasConsent: true });
    });

    it('should redirect to dashboard after timeout', async () => {
      renderHook(() => useTeslaCallback());
      await act(async () => {
        await flushMicrotasks();
      });
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('When authentication is successful and user does not have consent', () => {
    beforeEach(() => {
      (apiClient.request as jest.Mock).mockResolvedValue({ token: 'exchanged-jwt' });
      (hasToken as jest.Mock).mockReturnValue(true);
      (getConsentStatusUseCase.execute as jest.Mock).mockResolvedValue({ hasConsent: false });
    });

    it('should redirect to consent after timeout', async () => {
      renderHook(() => useTeslaCallback());
      await act(async () => {
        await flushMicrotasks();
      });
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(mockRouter.replace).toHaveBeenCalledWith('/consent');
    });
  });

  describe('When no token is received', () => {
    beforeEach(() => {
      (apiClient.request as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
      (hasToken as jest.Mock).mockReturnValue(false);
    });

    it('should set status to error', async () => {
      const { result } = renderHook(() => useTeslaCallback());
      await act(async () => {
        await flushMicrotasks();
      });
      expect(result.current.status).toStrictEqual('error');
    });
  });
});
