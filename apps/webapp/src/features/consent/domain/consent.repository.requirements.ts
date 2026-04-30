import {
  ConsentTextResponse,
  ConsentStatus,
  ConsentAcceptRequest,
  ConsentAcceptResponse,
  GenericConsentResponse,
} from './entities';

export interface ConsentRepositoryRequirements {
  getConsentText(version?: string, locale?: string): Promise<ConsentTextResponse>;
  getConsentStatus(): Promise<ConsentStatus>;
  acceptConsent(consentData: ConsentAcceptRequest): Promise<ConsentAcceptResponse>;
  revokeConsent(): Promise<GenericConsentResponse>;
}
