import { ConsentRepositoryRequirements } from '../consent.repository.requirements';
import {
  ConsentTextResponse,
  ConsentStatus,
  ConsentAcceptRequest,
  ConsentAcceptResponse,
  GenericConsentResponse,
} from '../entities';

export class GetConsentTextUseCase {
  constructor(private repository: ConsentRepositoryRequirements) {}

  async execute(version = 'v1', locale = 'en'): Promise<ConsentTextResponse> {
    return this.repository.getConsentText(version, locale);
  }
}

export class GetConsentStatusUseCase {
  constructor(private repository: ConsentRepositoryRequirements) {}

  async execute(): Promise<ConsentStatus> {
    return this.repository.getConsentStatus();
  }
}

export class AcceptConsentUseCase {
  constructor(private repository: ConsentRepositoryRequirements) {}

  async execute(consentData: ConsentAcceptRequest): Promise<ConsentAcceptResponse> {
    return this.repository.acceptConsent(consentData);
  }
}

export class RevokeConsentUseCase {
  constructor(private repository: ConsentRepositoryRequirements) {}

  async execute(): Promise<GenericConsentResponse> {
    return this.repository.revokeConsent();
  }
}
