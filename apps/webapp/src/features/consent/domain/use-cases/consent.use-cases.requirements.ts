import {
  ConsentTextResponse,
  ConsentStatus,
  ConsentAcceptRequest,
  ConsentAcceptResponse,
  GenericConsentResponse,
} from '../entities';

export interface GetConsentTextRequirements {
  execute(version?: string, locale?: string): Promise<ConsentTextResponse>;
}

export interface GetConsentStatusRequirements {
  execute(): Promise<ConsentStatus>;
}

export interface AcceptConsentRequirements {
  execute(consentData: ConsentAcceptRequest): Promise<ConsentAcceptResponse>;
}

export interface RevokeConsentRequirements {
  execute(): Promise<GenericConsentResponse>;
}
