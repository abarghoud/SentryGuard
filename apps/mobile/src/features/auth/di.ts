import { apiClient } from '../../core/api';
import { AuthApiRepository } from './data/auth.api-repository';
import {
  GetAuthProfileUseCase,
  GetTeslaLoginUrlUseCase,
  GetTeslaScopeChangeUrlUseCase,
  GetVehicleCommandsAuthorizationUseCase,
} from './domain/use-cases/auth.use-cases';

export const authRepository = new AuthApiRepository(apiClient);

export const getTeslaLoginUrlUseCase = new GetTeslaLoginUrlUseCase(authRepository);
export const getTeslaScopeChangeUrlUseCase = new GetTeslaScopeChangeUrlUseCase(authRepository);
export const getAuthProfileUseCase = new GetAuthProfileUseCase(authRepository);
export const getVehicleCommandsAuthorizationUseCase = new GetVehicleCommandsAuthorizationUseCase(authRepository);
