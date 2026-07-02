import { UserLanguage, UserLanguageResponse } from '../entities';
import { UserRepositoryRequirements } from '../user.repository.requirements';
import { GetUserLanguageRequirements, UpdateUserLanguageRequirements } from './user.use-cases.requirements';

export class GetUserLanguageUseCase implements GetUserLanguageRequirements {
  public constructor(private readonly repository: UserRepositoryRequirements) {}

  public async execute(): Promise<UserLanguageResponse> {
    return this.repository.getUserLanguage();
  }
}

export class UpdateUserLanguageUseCase implements UpdateUserLanguageRequirements {
  public constructor(private readonly repository: UserRepositoryRequirements) {}

  public async execute(language: UserLanguage): Promise<UserLanguageResponse> {
    return this.repository.updateUserLanguage(language);
  }
}
