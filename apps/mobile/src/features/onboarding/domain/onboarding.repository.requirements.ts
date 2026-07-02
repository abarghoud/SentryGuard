import { OnboardingStatus } from './entities';

export interface OnboardingRepositoryRequirements {
  completeOnboarding(): Promise<{ success: boolean }>;
  getOnboardingStatus(): Promise<OnboardingStatus>;
  skipOnboarding(): Promise<{ success: boolean }>;
}
