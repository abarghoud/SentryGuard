import { ConsentAcceptRequest, ConsentStatus, ConsentTextResponse } from '../entities';

export interface GetConsentStatusRequirements {
  execute(): Promise<ConsentStatus>;
}

export interface GetConsentTextRequirements {
  execute(locale?: string): Promise<ConsentTextResponse>;
}

export interface AcceptConsentRequirements {
  execute(consent: ConsentAcceptRequest): Promise<{ success: boolean }>;
}
