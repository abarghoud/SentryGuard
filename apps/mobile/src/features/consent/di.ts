import { apiClient, tokenStore } from '../../core/api';
import { ConsentApiRepository } from './data/consent.api-repository';
import { ConsentMockRepository } from './data/consent.mock-repository';
import { ConsentRepositoryRequirements } from './domain/consent.repository.requirements';
import { ConsentAcceptRequest, ConsentStatus, ConsentTextResponse } from './domain/entities';
import {
  AcceptConsentUseCase,
  GetConsentStatusUseCase,
  GetConsentTextUseCase,
  RevokeConsentUseCase,
} from './domain/use-cases/consent.use-cases';

class DynamicConsentRepository implements ConsentRepositoryRequirements {
  public constructor(
    private readonly apiRepo: ConsentRepositoryRequirements,
    private readonly mockRepo: ConsentRepositoryRequirements
  ) {}

  private getRepo(): ConsentRepositoryRequirements {
    return tokenStore.isDemo() ? this.mockRepo : this.apiRepo;
  }

  public async getConsentStatus(): Promise<ConsentStatus> {
    return this.getRepo().getConsentStatus();
  }

  public async acceptConsent(consent: ConsentAcceptRequest): Promise<{ success: boolean }> {
    return this.getRepo().acceptConsent(consent);
  }

  public async getConsentText(locale?: string): Promise<ConsentTextResponse> {
    return this.getRepo().getConsentText(locale);
  }

  public async revokeConsent(): Promise<{ success: boolean }> {
    return this.getRepo().revokeConsent();
  }
}

export const consentRepository = new DynamicConsentRepository(
  new ConsentApiRepository(apiClient),
  new ConsentMockRepository()
);

export const getConsentStatusUseCase = new GetConsentStatusUseCase(consentRepository);
export const getConsentTextUseCase = new GetConsentTextUseCase(consentRepository);
export const acceptConsentUseCase = new AcceptConsentUseCase(consentRepository);
export const revokeConsentUseCase = new RevokeConsentUseCase(consentRepository);
