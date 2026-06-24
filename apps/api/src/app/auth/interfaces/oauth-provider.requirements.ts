import { SupportedLanguage } from '../../../common/utils/language.util';

export const oauthProviderRequirementsSymbol = Symbol('OAuthProviderRequirements');

export interface OAuthUserProfile {
  email?: string;
  full_name?: string;
}

export interface OAuthTokensResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expiresAt: Date;
}

export interface OAuthAuthenticationResult {
  mobileRedirectUri?: string;
  tokens: OAuthTokensResponse;
  profile: OAuthUserProfile;
  userLocale: SupportedLanguage;
}

export interface OAuthProviderRequirements {
  generateLoginUrl(userLocale: SupportedLanguage, mobileRedirectUri?: string): { url: string; state: string };
  generateScopeChangeUrl(
    userLocale: SupportedLanguage,
    missingScopes?: string[],
    mobileRedirectUri?: string
  ): { url: string; state: string };
  authenticateWithCode(
    code: string,
    state: string
  ): Promise<OAuthAuthenticationResult>;
}
