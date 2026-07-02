import { UserLanguage, UserLanguageResponse } from './entities';

export interface UserRepositoryRequirements {
  getUserLanguage(): Promise<UserLanguageResponse>;
  updateUserLanguage(language: UserLanguage): Promise<UserLanguageResponse>;
}
