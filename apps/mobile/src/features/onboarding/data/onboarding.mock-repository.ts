import { OnboardingStatus } from '../domain/entities';
import { OnboardingRepositoryRequirements } from '../domain/onboarding.repository.requirements';

export class OnboardingMockRepository implements OnboardingRepositoryRequirements {
  public async getOnboardingStatus(): Promise<OnboardingStatus> {
    return { isComplete: true, isSkipped: false };
  }

  public async completeOnboarding(): Promise<{ success: boolean }> {
    return { success: true };
  }

  public async skipOnboarding(): Promise<{ success: boolean }> {
    return { success: true };
  }
}
