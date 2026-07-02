import { ApiClientRequirements } from '../../../core/api/api-client';
import { OnboardingStatus } from '../domain/entities';
import { OnboardingRepositoryRequirements } from '../domain/onboarding.repository.requirements';

export class OnboardingApiRepository implements OnboardingRepositoryRequirements {
  public constructor(private readonly client: ApiClientRequirements) {}

  public async getOnboardingStatus(): Promise<OnboardingStatus> {
    return this.client.request<OnboardingStatus>('/onboarding/status');
  }

  public async completeOnboarding(): Promise<{ success: boolean }> {
    return this.client.request<{ success: boolean }>('/onboarding/complete', {
      method: 'POST',
    });
  }

  public async skipOnboarding(): Promise<{ success: boolean }> {
    return this.client.request<{ success: boolean }>('/onboarding/skip', {
      method: 'POST',
    });
  }
}
