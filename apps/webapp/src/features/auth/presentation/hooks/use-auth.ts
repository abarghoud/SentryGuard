import { useState, useCallback, useEffect } from 'react';
import { AuthStatus, UserProfile } from '../../domain/entities';
import {
  checkAuthStatusUseCase,
  getUserProfileUseCase,
  logoutUseCase,
  getLoginUrlUseCase,
  getScopeChangeUrlUseCase,
} from '../../di';
import { ScopeError } from '../../../../core/api/api-client';
import { getToken, clearToken } from '../../../../core/api/token-manager';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<ScopeError | null>(null);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setScopeError(null);

    try {
      const token = getToken();

      if (!token) {
        setIsAuthenticated(false);
        setProfile(null);
        setAuthStatus(null);
        setIsLoading(false);
        return;
      }

      const status = await checkAuthStatusUseCase.execute();
      setAuthStatus(status);
      setIsAuthenticated(status.authenticated);

      if (status.authenticated) {
        const p = await getUserProfileUseCase.execute();
        setProfile(p);
      } else {
        setProfile(null);
      }
    } catch (err) {
      if (err instanceof ScopeError) {
        setScopeError(err);
        setIsAuthenticated(false);
        setProfile(null);
        setAuthStatus(null);
      } else {
        console.error('Auth check error:', err);
        setError(err instanceof Error ? err.message : 'Authentication check failed');
        setIsAuthenticated(false);
        setProfile(null);
        setAuthStatus(null);
        clearToken();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUseCase.execute();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearToken();
      setIsAuthenticated(false);
      setProfile(null);
      setAuthStatus(null);

      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, []);

  const getLoginUrl = useCallback(async () => {
    return getLoginUrlUseCase.execute();
  }, []);

  const getScopeChangeUrl = useCallback(async (missingScopes?: string[]) => {
    return getScopeChangeUrlUseCase.execute(missingScopes);
  }, []);

  const clearScopeError = useCallback(() => {
    setScopeError(null);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    authStatus,
    profile,
    isLoading,
    error,
    scopeError,
    refreshAuth: checkAuth,
    checkAuth,
    logout,
    getLoginUrl,
    getScopeChangeUrl,
    clearScopeError,
  };
}
