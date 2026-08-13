import { ApiClientRequirements } from '../api/api-client';
import { TokenStoreRequirements } from '../api/token-store';

export class SessionValidator {
  public constructor(
    private readonly apiClient: ApiClientRequirements,
    private readonly tokenStore: TokenStoreRequirements
  ) {}

  public async ensureSessionValid(): Promise<void> {
    if (this.tokenStore.getToken()) {
      await this.apiClient.request('/user/language');
    }
  }
}
