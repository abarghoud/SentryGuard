import { apiClient } from '../../core/api';
import { ConsentApiRepository } from './data/consent.api-repository';
import {
  GetConsentTextUseCase,
  GetConsentStatusUseCase,
  AcceptConsentUseCase,
  RevokeConsentUseCase,
} from './domain/use-cases/consent.use-cases';

export const consentRepository = new ConsentApiRepository(apiClient);

export const getConsentTextUseCase = new GetConsentTextUseCase(consentRepository);
export const getConsentStatusUseCase = new GetConsentStatusUseCase(consentRepository);
export const acceptConsentUseCase = new AcceptConsentUseCase(consentRepository);
export const revokeConsentUseCase = new RevokeConsentUseCase(consentRepository);

import { createUseConsentQuery } from './presentation/queries/use-consent-query';

export const useConsentQuery = createUseConsentQuery({
  getConsentStatusUseCase,
  getConsentTextUseCase,
  acceptConsentUseCase,
  revokeConsentUseCase,
});
