import { UserLanguage, UpdateLanguageResponse } from '../entities';

export interface GetUserLanguageRequirements {
  execute(): Promise<UserLanguage>;
}

export interface UpdateUserLanguageRequirements {
  execute(language: 'en' | 'fr'): Promise<UpdateLanguageResponse>;
}
