import { OnboardingRepositoryRequirements } from '../onboarding.repository.requirements';
import { OnboardingStatus, OnboardingActionResponse } from '../entities';
import {
  GetOnboardingStatusRequirements,
  CompleteOnboardingRequirements,
  SkipOnboardingRequirements,
} from './onboarding.use-cases.requirements';

export class GetOnboardingStatusUseCase implements GetOnboardingStatusRequirements {
  constructor(private repository: OnboardingRepositoryRequirements) {}

  async execute(): Promise<OnboardingStatus> {
    return this.repository.getOnboardingStatus();
  }
}

export class CompleteOnboardingUseCase implements CompleteOnboardingRequirements {
  constructor(private repository: OnboardingRepositoryRequirements) {}

  async execute(): Promise<OnboardingActionResponse> {
    return this.repository.completeOnboarding();
  }
}

export class SkipOnboardingUseCase implements SkipOnboardingRequirements {
  constructor(private repository: OnboardingRepositoryRequirements) {}

  async execute(): Promise<OnboardingActionResponse> {
    return this.repository.skipOnboarding();
  }
}
