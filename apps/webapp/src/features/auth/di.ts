import { apiClient } from '../../core/api';
import { AuthApiRepository } from './data/auth.api-repository';
import {
  GetLoginUrlUseCase,
  GetScopeChangeUrlUseCase,
  CheckAuthStatusUseCase,
  GetUserProfileUseCase,
  ValidateTokenUseCase,
  LogoutUseCase,
} from './domain/use-cases/auth.use-cases';

export const authRepository = new AuthApiRepository(apiClient);

export const getLoginUrlUseCase = new GetLoginUrlUseCase(authRepository);
export const getScopeChangeUrlUseCase = new GetScopeChangeUrlUseCase(authRepository);
export const checkAuthStatusUseCase = new CheckAuthStatusUseCase(authRepository);
export const getUserProfileUseCase = new GetUserProfileUseCase(authRepository);
export const validateTokenUseCase = new ValidateTokenUseCase(authRepository);
export const logoutUseCase = new LogoutUseCase(authRepository);
