import { SupportedLocale } from '../../../core/i18n/i18n-config';
import { UserLanguage, UpdateLanguageResponse } from './entities';

export interface UserRepositoryRequirements {
  getUserLanguage(): Promise<UserLanguage>;
  updateUserLanguage(language: SupportedLocale): Promise<UpdateLanguageResponse>;
}
