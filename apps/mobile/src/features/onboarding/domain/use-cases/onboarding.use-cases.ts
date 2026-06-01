import { OnboardingStatus } from '../entities';
import { OnboardingRepositoryRequirements } from '../onboarding.repository.requirements';
import {
  CompleteOnboardingRequirements,
  GetOnboardingStatusRequirements,
  SkipOnboardingRequirements,
} from './onboarding.use-cases.requirements';

export class GetOnboardingStatusUseCase implements GetOnboardingStatusRequirements {
  public constructor(private readonly repository: OnboardingRepositoryRequirements) {}

  public async execute(): Promise<OnboardingStatus> {
    return this.repository.getOnboardingStatus();
  }
}

export class CompleteOnboardingUseCase implements CompleteOnboardingRequirements {
  public constructor(private readonly repository: OnboardingRepositoryRequirements) {}

  public async execute(): Promise<{ success: boolean }> {
    return this.repository.completeOnboarding();
  }
}

export class SkipOnboardingUseCase implements SkipOnboardingRequirements {
  public constructor(private readonly repository: OnboardingRepositoryRequirements) {}

  public async execute(): Promise<{ success: boolean }> {
    return this.repository.skipOnboarding();
  }
}
