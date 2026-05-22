import { requestApi } from './api-client';

export interface OnboardingStatus {
  isComplete: boolean;
  isSkipped: boolean;
}

export function getOnboardingStatus(): Promise<OnboardingStatus> {
  return requestApi<OnboardingStatus>('/onboarding/status');
}

export function completeOnboarding(): Promise<{ success: boolean }> {
  return requestApi<{ success: boolean }>('/onboarding/complete', {
    method: 'POST',
  });
}

export function skipOnboarding(): Promise<{ success: boolean }> {
  return requestApi<{ success: boolean }>('/onboarding/skip', {
    method: 'POST',
  });
}
