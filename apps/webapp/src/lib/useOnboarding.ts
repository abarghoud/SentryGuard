'use client';

import { useState, useEffect, useCallback } from 'react';
import { hasToken, getOnboardingStatus, completeOnboarding as completeOnboardingApi, skipOnboarding as skipOnboardingApi, ApiError } from './api';

export enum OnboardingStep {
  TELEGRAM_LINK = 'telegram_link',
  VIRTUAL_KEY_SETUP = 'virtual_key_setup',
  TELEMETRY_ACTIVATION = 'telemetry_activation',
}

export function useOnboarding() {
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!hasToken()) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getOnboardingStatus();
      setIsComplete(data.isComplete);
      setError(null);
    } catch (err) {
      console.error('Error checking onboarding status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const completeOnboarding = useCallback(async () => {
    try {
      await completeOnboardingApi();

      setIsComplete(true);
      return { success: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Unknown error');
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const skipOnboarding = useCallback(async () => {
    try {
      await skipOnboardingApi();

      setIsComplete(true);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  return {
    isComplete,
    isLoading,
    error,
    completeOnboarding,
    skipOnboarding,
    checkStatus,
  };
}
