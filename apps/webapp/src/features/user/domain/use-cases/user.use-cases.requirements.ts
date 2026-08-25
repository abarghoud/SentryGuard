import { SupportedLocale } from '../../../../core/i18n/i18n-config';
import { UserLanguage, UpdateLanguageResponse } from '../entities';

export interface GetUserLanguageRequirements {
  execute(): Promise<UserLanguage>;
}

export interface UpdateUserLanguageRequirements {
  execute(language: SupportedLocale): Promise<UpdateLanguageResponse>;
}
