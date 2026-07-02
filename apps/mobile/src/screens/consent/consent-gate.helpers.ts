import { ConsentStatus } from '../../features/consent/domain/entities';

export function shouldRequestConsent(consentStatus: ConsentStatus | undefined, isOnboardingComplete: boolean): boolean {
  return isOnboardingComplete && consentStatus?.hasConsent === false;
}
