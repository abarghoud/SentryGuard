import { useState, useCallback, useEffect } from 'react';
import {
  getOnboardingStatusUseCase,
  completeOnboardingUseCase,
  skipOnboardingUseCase,
} from '../../di';
import { hasToken } from '../../../../core/api/token-manager';
import { ApiError } from '../../../../core/api/api-client';

export enum OnboardingStep {
  TELEGRAM_LINK = 'telegram_link',
  VIRTUAL_KEY_SETUP = 'virtual_key_setup',
  TELEMETRY_ACTIVATION = 'telemetry_activation',
}

export function useOnboarding() {
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!hasToken()) {
      setIsLoading(false);
      return;
    }

    try {
      const status = await getOnboardingStatusUseCase.execute();
      setIsComplete(status.isComplete);
      setError(null);
    } catch (err) {
      console.error('Error checking onboarding status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await completeOnboardingUseCase.execute();
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
      await skipOnboardingUseCase.execute();
      setIsComplete(true);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    isComplete,
    isLoading,
    error,
    completeOnboarding,
    skipOnboarding,
    checkStatus,
  };
}
