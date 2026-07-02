import { ApiClientRequirements } from '../../../core/api/api-client';
import { AuthProfile, TeslaLoginResponse, VehicleCommandsAuthorization } from '../domain/entities';
import { AuthRepositoryRequirements } from '../domain/auth.repository.requirements';

export class AuthApiRepository implements AuthRepositoryRequirements {
  public constructor(private readonly client: ApiClientRequirements) {}

  public async getTeslaLoginUrl(redirectUri?: string): Promise<TeslaLoginResponse> {
    const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
    return this.client.request<TeslaLoginResponse>(`/auth/tesla/login${query}`);
  }

  public async getTeslaScopeChangeUrl(missingScopes: string[], redirectUri?: string): Promise<TeslaLoginResponse> {
    const params = new URLSearchParams();
    params.set('missing', missingScopes.join(','));

    if (redirectUri) {
      params.set('redirect_uri', redirectUri);
    }

    return this.client.request<TeslaLoginResponse>(`/auth/tesla/scope-change?${params.toString()}`);
  }

  public async getAuthProfile(): Promise<AuthProfile> {
    return this.client.request<AuthProfile>('/auth/profile');
  }

  public async getVehicleCommandsAuthorization(): Promise<VehicleCommandsAuthorization> {
    return this.client.request<VehicleCommandsAuthorization>('/auth/vehicle-commands-authorized');
  }

  public async demoLogin(credentials: { email?: string; password?: string }): Promise<{ jwt: string }> {
    return this.client.request<{ jwt: string }>('/auth/demo/login', {
      body: JSON.stringify(credentials),
      method: 'POST',
    });
  }
}
