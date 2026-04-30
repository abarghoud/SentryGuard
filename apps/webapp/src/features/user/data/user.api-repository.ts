import { UserRepositoryRequirements } from '../domain/user.repository.requirements';
import { UserLanguage, UpdateLanguageResponse } from '../domain/entities';
import { ApiClientRequirements } from '../../../core/api/api-client';

export class UserApiRepository implements UserRepositoryRequirements {
  constructor(private client: ApiClientRequirements) {}

  async getUserLanguage(): Promise<UserLanguage> {
    return this.client.request<UserLanguage>('/user/language', {
      method: 'GET',
    });
  }

  async updateUserLanguage(language: 'en' | 'fr'): Promise<UpdateLanguageResponse> {
    return this.client.request<UpdateLanguageResponse>('/user/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    });
  }
}
