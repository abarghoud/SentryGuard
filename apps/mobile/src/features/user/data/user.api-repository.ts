import { ApiClientRequirements } from '../../../core/api/api-client';
import { UserLanguage, UserLanguageResponse } from '../domain/entities';
import { UserRepositoryRequirements } from '../domain/user.repository.requirements';

export class UserApiRepository implements UserRepositoryRequirements {
  public constructor(private readonly client: ApiClientRequirements) {}

  public async getUserLanguage(): Promise<UserLanguageResponse> {
    return this.client.request<UserLanguageResponse>('/user/language');
  }

  public async updateUserLanguage(language: UserLanguage): Promise<UserLanguageResponse> {
    return this.client.request<UserLanguageResponse>('/user/language', {
      body: JSON.stringify({ language }),
      method: 'PATCH',
    });
  }
}
