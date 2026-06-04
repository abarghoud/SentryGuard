import { ConsentAcceptRequest, ConsentStatus, ConsentTextResponse } from './entities';

export interface ConsentRepositoryRequirements {
  acceptConsent(consent: ConsentAcceptRequest): Promise<{ success: boolean }>;
  getConsentStatus(): Promise<ConsentStatus>;
  getConsentText(locale?: string): Promise<ConsentTextResponse>;
  revokeConsent(): Promise<{ success: boolean }>;
}
