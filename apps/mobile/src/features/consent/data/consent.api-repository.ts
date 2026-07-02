import { ApiClientRequirements } from '../../../core/api/api-client';
import { ConsentAcceptRequest, ConsentStatus, ConsentTextResponse } from '../domain/entities';
import { ConsentRepositoryRequirements } from '../domain/consent.repository.requirements';

export class ConsentApiRepository implements ConsentRepositoryRequirements {
  public constructor(private readonly client: ApiClientRequirements) {}

  public async getConsentStatus(): Promise<ConsentStatus> {
    return this.client.request<ConsentStatus>('/consent/current');
  }

  public async getConsentText(locale = 'fr'): Promise<ConsentTextResponse> {
    return this.client.request<ConsentTextResponse>(`/consent/text?locale=${locale}`);
  }

  public async acceptConsent(consent: ConsentAcceptRequest): Promise<{ success: boolean }> {
    return this.client.request<{ success: boolean }>('/consent/accept', {
      body: JSON.stringify(consent),
      method: 'POST',
    });
  }

  public async revokeConsent(): Promise<{ success: boolean }> {
    return this.client.request<{ success: boolean }>('/consent/revoke', {
      method: 'POST',
    });
  }
}
