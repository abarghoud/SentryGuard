import { apiClient, tokenStore } from '../../core/api';
import { UserApiRepository } from './data/user.api-repository';
import { UserMockRepository } from './data/user.mock-repository';
import { UserRepositoryRequirements } from './domain/user.repository.requirements';
import { UserLanguage, UserLanguageResponse } from './domain/entities';
import { GetUserLanguageUseCase, UpdateUserLanguageUseCase } from './domain/use-cases/user.use-cases';

class DynamicUserRepository implements UserRepositoryRequirements {
  public constructor(
    private readonly apiRepo: UserRepositoryRequirements,
    private readonly mockRepo: UserRepositoryRequirements
  ) {}

  private getRepo(): UserRepositoryRequirements {
    return tokenStore.isDemo() ? this.mockRepo : this.apiRepo;
  }

  public async getUserLanguage(): Promise<UserLanguageResponse> {
    return this.getRepo().getUserLanguage();
  }

  public async updateUserLanguage(language: UserLanguage): Promise<UserLanguageResponse> {
    return this.getRepo().updateUserLanguage(language);
  }
}

export const userRepository = new DynamicUserRepository(
  new UserApiRepository(apiClient),
  new UserMockRepository()
);

export const getUserLanguageUseCase = new GetUserLanguageUseCase(userRepository);
export const updateUserLanguageUseCase = new UpdateUserLanguageUseCase(userRepository);
