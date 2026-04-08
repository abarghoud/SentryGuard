import { OnboardingRepositoryRequirements } from '../onboarding.repository.requirements';
import { OnboardingStatus, OnboardingActionResponse } from '../entities';

export class GetOnboardingStatusUseCase {
  constructor(private repository: OnboardingRepositoryRequirements) {}

  async execute(): Promise<OnboardingStatus> {
    return this.repository.getOnboardingStatus();
  }
}

export class CompleteOnboardingUseCase {
  constructor(private repository: OnboardingRepositoryRequirements) {}

  async execute(): Promise<OnboardingActionResponse> {
    return this.repository.completeOnboarding();
  }
}

export class SkipOnboardingUseCase {
  constructor(private repository: OnboardingRepositoryRequirements) {}

  async execute(): Promise<OnboardingActionResponse> {
    return this.repository.skipOnboarding();
  }
}
