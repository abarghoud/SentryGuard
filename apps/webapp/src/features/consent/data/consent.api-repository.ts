import { ConsentRepositoryRequirements } from '../domain/consent.repository.requirements';
import {
  ConsentTextResponse,
  ConsentStatus,
  ConsentAcceptRequest,
  ConsentAcceptResponse,
  GenericConsentResponse,
} from '../domain/entities';
import { ApiClientRequirements } from '../../../core/api/api-client';

export class ConsentApiRepository implements ConsentRepositoryRequirements {
  constructor(private client: ApiClientRequirements) {}

  async getConsentText(version = 'v1', locale = 'en'): Promise<ConsentTextResponse> {
    const params = new URLSearchParams({ version, locale });
    return this.client.request<ConsentTextResponse>(`/consent/text?${params.toString()}`);
  }

  async getConsentStatus(): Promise<ConsentStatus> {
    return this.client.request<ConsentStatus>('/consent/current');
  }

  async acceptConsent(consentData: ConsentAcceptRequest): Promise<ConsentAcceptResponse> {
    return this.client.request<ConsentAcceptResponse>('/consent/accept', {
      method: 'POST',
      body: JSON.stringify(consentData),
    });
  }

  async revokeConsent(): Promise<GenericConsentResponse> {
    return this.client.request<GenericConsentResponse>('/consent/revoke', {
      method: 'POST',
    });
  }
}
