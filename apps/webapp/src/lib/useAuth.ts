'use client';

import { useState, useEffect } from 'react';
import {
  checkAuthStatus,
  getUserProfile,
  getToken,
  clearToken,
  logout as apiLogout,
  validateToken,
  type UserProfile,
  type AuthStatus,
  ScopeError,
} from './api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<ScopeError | null>(null);

  const checkAuth = async () => {
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

      // Validate token first
      const isValid = await validateToken();

      if (!isValid) {
        // Token is invalid or expired
        clearToken();
        setIsAuthenticated(false);
        setProfile(null);
        setAuthStatus(null);
        setIsLoading(false);
        return;
      }

      // Get authentication status
      const status = await checkAuthStatus();
      setAuthStatus(status);
      setIsAuthenticated(status.authenticated);

      if (status.authenticated) {
        // Get user profile
        const userProfile = await getUserProfile();
        setProfile(userProfile);
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
        setError(
          err instanceof Error ? err.message : 'Authentication check failed'
        );
        setIsAuthenticated(false);
        setProfile(null);
        setAuthStatus(null);
        clearToken();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call API to revoke token
      await apiLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      clearToken();
      setIsAuthenticated(false);
      setProfile(null);
      setAuthStatus(null);

      // Redirect to home
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  const refreshAuth = () => {
    checkAuth();
  };

  const clearScopeError = () => {
    setScopeError(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    isAuthenticated,
    isLoading,
    profile,
    authStatus,
    error,
    scopeError,
    checkAuth,
    refreshAuth,
    logout,
    clearScopeError,
  };
}
