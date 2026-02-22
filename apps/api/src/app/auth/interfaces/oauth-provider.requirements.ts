export const oauthProviderRequirementsSymbol = Symbol('OAuthProviderRequirements');

export interface OAuthUserProfile {
  email?: string;
  full_name?: string;
  profile_image_url?: string;
}

export interface OAuthTokensResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expiresAt: Date;
}

export interface OAuthAuthenticationResult {
  tokens: OAuthTokensResponse;
  profile: OAuthUserProfile | undefined;
  userLocale: 'en' | 'fr';
}

export interface OAuthProviderRequirements {
  generateLoginUrl(userLocale: 'en' | 'fr'): { url: string; state: string };
  generateScopeChangeUrl(
    userLocale: 'en' | 'fr',
    missingScopes?: string[]
  ): { url: string; state: string };
  authenticateWithCode(
    code: string,
    state: string
  ): Promise<OAuthAuthenticationResult>;
}
