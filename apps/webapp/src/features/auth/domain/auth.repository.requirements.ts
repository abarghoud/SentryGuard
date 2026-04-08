import { LoginUrlResponse, AuthStatus, UserProfile } from './entities';

export interface AuthRepositoryRequirements {
  getLoginUrl(): Promise<LoginUrlResponse>;
  getScopeChangeUrl(missingScopes?: string[]): Promise<LoginUrlResponse>;
  checkAuthStatus(): Promise<AuthStatus>;
  getUserProfile(): Promise<UserProfile | null>;
  validateToken(): Promise<boolean>;
  logout(): Promise<void>;
}
