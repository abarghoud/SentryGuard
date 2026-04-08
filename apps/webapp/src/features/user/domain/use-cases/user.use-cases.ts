import { UserRepositoryRequirements } from '../user.repository.requirements';
import { UserLanguage, UpdateLanguageResponse } from '../entities';

export class GetUserLanguageUseCase {
  constructor(private repository: UserRepositoryRequirements) {}

  async execute(): Promise<UserLanguage> {
    return this.repository.getUserLanguage();
  }
}

export class UpdateUserLanguageUseCase {
  constructor(private repository: UserRepositoryRequirements) {}

  async execute(language: 'en' | 'fr'): Promise<UpdateLanguageResponse> {
    return this.repository.updateUserLanguage(language);
  }
}
