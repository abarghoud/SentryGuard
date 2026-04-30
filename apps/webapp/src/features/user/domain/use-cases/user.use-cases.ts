import { UserRepositoryRequirements } from '../user.repository.requirements';
import { UserLanguage, UpdateLanguageResponse } from '../entities';
import {
  GetUserLanguageRequirements,
  UpdateUserLanguageRequirements,
} from './user.use-cases.requirements';

export class GetUserLanguageUseCase implements GetUserLanguageRequirements {
  constructor(private repository: UserRepositoryRequirements) {}

  async execute(): Promise<UserLanguage> {
    return this.repository.getUserLanguage();
  }
}

export class UpdateUserLanguageUseCase implements UpdateUserLanguageRequirements {
  constructor(private repository: UserRepositoryRequirements) {}

  async execute(language: 'en' | 'fr'): Promise<UpdateLanguageResponse> {
    return this.repository.updateUserLanguage(language);
  }
}
