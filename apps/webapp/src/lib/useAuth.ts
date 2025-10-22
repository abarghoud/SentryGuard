'use client';

import { useState, useEffect } from 'react';
import { checkAuthStatus, getUserProfile, getUserId, clearUserId, type UserProfile } from './api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = getUserId();
      
      if (!userId) {
        setIsAuthenticated(false);
        setProfile(null);
        return;
      }

      const status = await checkAuthStatus();
      setIsAuthenticated(status.authenticated);

      if (status.authenticated) {
        const userProfile = await getUserProfile();
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication check failed');
      setIsAuthenticated(false);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearUserId();
    setIsAuthenticated(false);
    setProfile(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    isAuthenticated,
    isLoading,
    profile,
    error,
    checkAuth,
    logout,
  };
}

