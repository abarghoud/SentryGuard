import { OnboardingStatus, OnboardingActionResponse } from './entities';

export interface OnboardingRepositoryRequirements {
  getOnboardingStatus(): Promise<OnboardingStatus>;
  completeOnboarding(): Promise<OnboardingActionResponse>;
  skipOnboarding(): Promise<OnboardingActionResponse>;
  dismissAnnouncement(key: string): Promise<OnboardingActionResponse>;
}
