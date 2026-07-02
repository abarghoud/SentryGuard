import { ConsentAcceptRequest, ConsentStatus, ConsentTextResponse } from '../entities';
import { ConsentRepositoryRequirements } from '../consent.repository.requirements';
import {
  AcceptConsentRequirements,
  GetConsentStatusRequirements,
  GetConsentTextRequirements,
  RevokeConsentRequirements,
} from './consent.use-cases.requirements';

export class GetConsentStatusUseCase implements GetConsentStatusRequirements {
  public constructor(private readonly repository: ConsentRepositoryRequirements) {}

  public async execute(): Promise<ConsentStatus> {
    return this.repository.getConsentStatus();
  }
}

export class GetConsentTextUseCase implements GetConsentTextRequirements {
  public constructor(private readonly repository: ConsentRepositoryRequirements) {}

  public async execute(locale?: string): Promise<ConsentTextResponse> {
    return this.repository.getConsentText(locale);
  }
}

export class AcceptConsentUseCase implements AcceptConsentRequirements {
  public constructor(private readonly repository: ConsentRepositoryRequirements) {}

  public async execute(consent: ConsentAcceptRequest): Promise<{ success: boolean }> {
    return this.repository.acceptConsent(consent);
  }
}

export class RevokeConsentUseCase implements RevokeConsentRequirements {
  public constructor(private readonly repository: ConsentRepositoryRequirements) {}

  public async execute(): Promise<{ success: boolean }> {
    return this.repository.revokeConsent();
  }
}
