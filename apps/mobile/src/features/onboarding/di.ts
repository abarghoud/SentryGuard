import { apiClient } from '../../core/api';
import { OnboardingApiRepository } from './data/onboarding.api-repository';
import {
  CompleteOnboardingUseCase,
  GetOnboardingStatusUseCase,
  SkipOnboardingUseCase,
} from './domain/use-cases/onboarding.use-cases';

export const onboardingRepository = new OnboardingApiRepository(apiClient);

export const getOnboardingStatusUseCase = new GetOnboardingStatusUseCase(onboardingRepository);
export const completeOnboardingUseCase = new CompleteOnboardingUseCase(onboardingRepository);
export const skipOnboardingUseCase = new SkipOnboardingUseCase(onboardingRepository);
