export interface ConsentStatus {
  hasConsent: boolean;
  isRevoked?: boolean;
}

export interface ConsentTextResponse {
  appTitle: string;
  locale: string;
  partnerName: string;
  text: string;
  version: string;
}

export interface ConsentAcceptRequest {
  appTitle: string;
  locale: string;
  partnerName: string;
  text: string;
  version: string;
}
