export interface ConsentTextResponse {
  version: string;
  locale: string;
  text: string;
  textHash: string;
  partnerName: string;
  appTitle: string;
}

export interface ConsentStatus {
  hasConsent: boolean;
  latestConsent?: {
    id: string;
    acceptedAt: string;
    version: string;
    locale: string;
  };
  isRevoked: boolean;
}

export interface ConsentAcceptRequest {
  version: string;
  locale: string;
  appTitle: string;
  partnerName: string;
}

export interface ConsentAcceptResponse {
  success: boolean;
  consent: {
    id: string;
    acceptedAt: string;
    version: string;
  };
}

export interface GenericConsentResponse {
  success: boolean;
  message: string;
}
