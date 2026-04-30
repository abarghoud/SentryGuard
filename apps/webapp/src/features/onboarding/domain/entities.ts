export interface OnboardingStatus {
  isComplete: boolean;
}

export interface OnboardingActionResponse {
  success: boolean;
}

export enum OnboardingStep {
  TELEGRAM_LINK = 'telegram_link',
  VIRTUAL_KEY_SETUP = 'virtual_key_setup',
  TELEMETRY_ACTIVATION = 'telemetry_activation',
}
