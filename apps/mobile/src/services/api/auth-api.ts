import { requestApi } from './api-client';

export interface TeslaLoginResponse {
  message: string;
  state: string;
  url: string;
}

export interface AuthProfile {
  profile: {
    email?: string;
    full_name?: string;
    isBetaTester: boolean;
    userId: string;
  };
  success: boolean;
}

export function getTeslaLoginUrl(redirectUri?: string): Promise<TeslaLoginResponse> {
  const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
  return requestApi<TeslaLoginResponse>(`/auth/tesla/login${query}`);
}

export function getTeslaScopeChangeUrl(missingScopes: string[], redirectUri?: string): Promise<TeslaLoginResponse> {
  const params = new URLSearchParams();
  params.set('missing', missingScopes.join(','));

  if (redirectUri) {
    params.set('redirect_uri', redirectUri);
  }

  return requestApi<TeslaLoginResponse>(`/auth/tesla/scope-change?${params.toString()}`);
}

export function getAuthProfile(): Promise<AuthProfile> {
  return requestApi<AuthProfile>('/auth/profile');
}

export function getVehicleCommandsAuthorization(): Promise<{ authorized: boolean }> {
  return requestApi<{ authorized: boolean }>('/auth/vehicle-commands-authorized');
}
