import { apiClient, tokenStore } from '../../core/api';
import { OnboardingApiRepository } from './data/onboarding.api-repository';
import { OnboardingMockRepository } from './data/onboarding.mock-repository';
import { OnboardingRepositoryRequirements } from './domain/onboarding.repository.requirements';
import { OnboardingStatus } from './domain/entities';
import {
  CompleteOnboardingUseCase,
  GetOnboardingStatusUseCase,
  SkipOnboardingUseCase,
} from './domain/use-cases/onboarding.use-cases';

class DynamicOnboardingRepository implements OnboardingRepositoryRequirements {
  public constructor(
    private readonly apiRepo: OnboardingRepositoryRequirements,
    private readonly mockRepo: OnboardingRepositoryRequirements
  ) {}

  private getRepo(): OnboardingRepositoryRequirements {
    return tokenStore.isDemo() ? this.mockRepo : this.apiRepo;
  }

  public async getOnboardingStatus(): Promise<OnboardingStatus> {
    return this.getRepo().getOnboardingStatus();
  }

  public async completeOnboarding(): Promise<{ success: boolean }> {
    return this.getRepo().completeOnboarding();
  }

  public async skipOnboarding(): Promise<{ success: boolean }> {
    return this.getRepo().skipOnboarding();
  }
}

export const onboardingRepository = new DynamicOnboardingRepository(
  new OnboardingApiRepository(apiClient),
  new OnboardingMockRepository()
);

export const getOnboardingStatusUseCase = new GetOnboardingStatusUseCase(onboardingRepository);
export const completeOnboardingUseCase = new CompleteOnboardingUseCase(onboardingRepository);
export const skipOnboardingUseCase = new SkipOnboardingUseCase(onboardingRepository);
