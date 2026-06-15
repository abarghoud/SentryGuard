import { UserLanguage, UserLanguageResponse } from '../domain/entities';
import { UserRepositoryRequirements } from '../domain/user.repository.requirements';

export class UserMockRepository implements UserRepositoryRequirements {
  private language = UserLanguage.English;

  public async getUserLanguage(): Promise<UserLanguageResponse> {
    return { language: this.language };
  }

  public async updateUserLanguage(language: UserLanguage): Promise<UserLanguageResponse> {
    this.language = language;
    return { language };
  }
}
