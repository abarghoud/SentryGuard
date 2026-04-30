import { ConsentRepositoryRequirements } from '../consent.repository.requirements';
import {
  ConsentTextResponse,
  ConsentStatus,
  ConsentAcceptRequest,
  ConsentAcceptResponse,
  GenericConsentResponse,
} from '../entities';
import {
  GetConsentTextRequirements,
  GetConsentStatusRequirements,
  AcceptConsentRequirements,
  RevokeConsentRequirements,
} from './consent.use-cases.requirements';

export class GetConsentTextUseCase implements GetConsentTextRequirements {
  constructor(private repository: ConsentRepositoryRequirements) {}

  async execute(version = 'v1', locale = 'en'): Promise<ConsentTextResponse> {
    return this.repository.getConsentText(version, locale);
  }
}

export class GetConsentStatusUseCase implements GetConsentStatusRequirements {
  constructor(private repository: ConsentRepositoryRequirements) {}

  async execute(): Promise<ConsentStatus> {
    return this.repository.getConsentStatus();
  }
}

export class AcceptConsentUseCase implements AcceptConsentRequirements {
  constructor(private repository: ConsentRepositoryRequirements) {}

  async execute(consentData: ConsentAcceptRequest): Promise<ConsentAcceptResponse> {
    return this.repository.acceptConsent(consentData);
  }
}

export class RevokeConsentUseCase implements RevokeConsentRequirements {
  constructor(private repository: ConsentRepositoryRequirements) {}

  async execute(): Promise<GenericConsentResponse> {
    return this.repository.revokeConsent();
  }
}
