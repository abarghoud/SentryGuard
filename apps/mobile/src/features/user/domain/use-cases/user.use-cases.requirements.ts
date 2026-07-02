import { UserLanguage, UserLanguageResponse } from '../entities';

export interface GetUserLanguageRequirements {
  execute(): Promise<UserLanguageResponse>;
}

export interface UpdateUserLanguageRequirements {
  execute(language: UserLanguage): Promise<UserLanguageResponse>;
}
