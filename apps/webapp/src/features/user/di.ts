import { apiClient } from '../../core/api';
import { UserApiRepository } from './data/user.api-repository';
import {
  GetUserLanguageUseCase,
  UpdateUserLanguageUseCase,
} from './domain/use-cases/user.use-cases';

export const userRepository = new UserApiRepository(apiClient);

export const getUserLanguageUseCase = new GetUserLanguageUseCase(userRepository);
export const updateUserLanguageUseCase = new UpdateUserLanguageUseCase(userRepository);

import { createUseUserQuery } from './presentation/queries/use-user-query';

export const useUserQuery = createUseUserQuery({
  getUserLanguageUseCase,
  updateUserLanguageUseCase,
});
