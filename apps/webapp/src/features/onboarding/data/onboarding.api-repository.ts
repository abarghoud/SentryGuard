import { OnboardingRepositoryRequirements } from '../domain/onboarding.repository.requirements';
import { OnboardingStatus, OnboardingActionResponse } from '../domain/entities';
import { ApiClientRequirements } from '../../../core/api/api-client';

export class OnboardingApiRepository implements OnboardingRepositoryRequirements {
  constructor(private client: ApiClientRequirements) {}

  public async getOnboardingStatus(): Promise<OnboardingStatus> {
    return this.client.request<OnboardingStatus>('/onboarding/status');
  }

  public async completeOnboarding(): Promise<OnboardingActionResponse> {
    return this.client.request<OnboardingActionResponse>('/onboarding/complete', {
      method: 'POST',
    });
  }

  public async skipOnboarding(): Promise<OnboardingActionResponse> {
    return this.client.request<OnboardingActionResponse>('/onboarding/skip', {
      method: 'POST',
    });
  }

  public async dismissAnnouncement(key: string): Promise<OnboardingActionResponse> {
    return this.client.request<OnboardingActionResponse>(`/onboarding/dismiss-announcement/${key}`, {
      method: 'POST',
    });
  }
}
