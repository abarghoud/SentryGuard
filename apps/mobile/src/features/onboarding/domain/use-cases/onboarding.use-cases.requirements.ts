import { OnboardingStatus } from '../entities';

export interface GetOnboardingStatusRequirements {
  execute(): Promise<OnboardingStatus>;
}

export interface CompleteOnboardingRequirements {
  execute(): Promise<{ success: boolean }>;
}

export interface SkipOnboardingRequirements {
  execute(): Promise<{ success: boolean }>;
}
