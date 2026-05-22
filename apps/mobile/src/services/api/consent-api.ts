import { requestApi } from './api-client';

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

export function getConsentStatus(): Promise<ConsentStatus> {
  return requestApi<ConsentStatus>('/consent/current');
}

export function getConsentText(locale = 'fr'): Promise<ConsentTextResponse> {
  return requestApi<ConsentTextResponse>(`/consent/text?version=v1&locale=${locale}`);
}

export function acceptConsent(consent: ConsentAcceptRequest): Promise<{ success: boolean }> {
  return requestApi<{ success: boolean }>('/consent/accept', {
    body: JSON.stringify(consent),
    method: 'POST',
  });
}
