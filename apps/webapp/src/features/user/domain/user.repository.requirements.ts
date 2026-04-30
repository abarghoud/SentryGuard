import { UserLanguage, UpdateLanguageResponse } from './entities';

export interface UserRepositoryRequirements {
  getUserLanguage(): Promise<UserLanguage>;
  updateUserLanguage(language: 'en' | 'fr'): Promise<UpdateLanguageResponse>;
}
