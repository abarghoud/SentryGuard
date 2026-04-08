import { AuthRepositoryRequirements } from '../domain/auth.repository.requirements';
import { LoginUrlResponse, AuthStatus, UserProfile } from '../domain/entities';
import { ApiClientRequirements } from '../../../core/api/api-client';
import { clearToken } from '../../../core/api/token-manager';

export class AuthApiRepository implements AuthRepositoryRequirements {
  constructor(private client: ApiClientRequirements) {}

  async getLoginUrl(): Promise<LoginUrlResponse> {
    return this.client.request<LoginUrlResponse>('/auth/tesla/login');
  }

  async getScopeChangeUrl(missingScopes?: string[]): Promise<LoginUrlResponse> {
    const params = new URLSearchParams();
    if (missingScopes && missingScopes.length > 0) {
      params.set('missing', missingScopes.join(','));
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/auth/tesla/scope-change?${queryString}` : '/auth/tesla/scope-change';

    return this.client.request<LoginUrlResponse>(endpoint);
  }

  async checkAuthStatus(): Promise<AuthStatus> {
    return this.client.request<AuthStatus>('/auth/status');
  }

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const response = await this.client.request<{
        success: boolean;
        profile: UserProfile;
      }>('/auth/profile');
      return response?.success ? response.profile : null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const response = await this.client.request<{ valid: boolean }>('/auth/validate');
      return response?.valid || false;
    } catch (error) {
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.request('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearToken();
    }
  }
}
