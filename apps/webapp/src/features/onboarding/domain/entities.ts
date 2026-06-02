export interface OnboardingStatus {
  isComplete: boolean;
  pendingAnnouncementKey: string | null;
}

export interface OnboardingActionResponse {
  success: boolean;
}

export enum OnboardingStep {
  TELEGRAM_LINK = 'telegram_link',
  VIRTUAL_KEY_SETUP = 'virtual_key_setup',
  TELEMETRY_ACTIVATION = 'telemetry_activation',
  FEATURE_DISCOVERY = 'feature_discovery',
}

export const ANNOUNCEMENT_TO_STEP: Record<string, OnboardingStep> = {
  break_in_offensive_response_v1: OnboardingStep.FEATURE_DISCOVERY,
};
