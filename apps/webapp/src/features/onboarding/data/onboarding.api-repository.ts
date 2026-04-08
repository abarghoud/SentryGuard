import { OnboardingRepositoryRequirements } from '../domain/onboarding.repository.requirements';
import { OnboardingStatus, OnboardingActionResponse } from '../domain/entities';
import { ApiClientRequirements } from '../../../core/api/api-client';

export class OnboardingApiRepository implements OnboardingRepositoryRequirements {
  constructor(private client: ApiClientRequirements) {}

  async getOnboardingStatus(): Promise<OnboardingStatus> {
    return this.client.request<OnboardingStatus>('/onboarding/status');
  }

  async completeOnboarding(): Promise<OnboardingActionResponse> {
    return this.client.request<OnboardingActionResponse>('/onboarding/complete', {
      method: 'POST',
    });
  }

  async skipOnboarding(): Promise<OnboardingActionResponse> {
    return this.client.request<OnboardingActionResponse>('/onboarding/skip', {
      method: 'POST',
    });
  }
}
