import { OnboardingStatus, OnboardingActionResponse } from '../entities';

export interface GetOnboardingStatusRequirements {
  execute(): Promise<OnboardingStatus>;
}

export interface CompleteOnboardingRequirements {
  execute(): Promise<OnboardingActionResponse>;
}

export interface SkipOnboardingRequirements {
  execute(): Promise<OnboardingActionResponse>;
}
