import { AuthStatus, UserProfile } from '../../domain/entities';
import { ScopeError } from '../../../../core/api/api-client';

export interface AuthHookRequirements {
  isAuthenticated: boolean;
  authStatus: AuthStatus | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  scopeError: ScopeError | null;
  refreshAuth: () => Promise<void>;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  getLoginUrl: () => Promise<{ url: string; state: string; message: string }>;
  getScopeChangeUrl: (missingScopes?: string[]) => Promise<{ url: string; state: string; message: string }>;
  clearScopeError: () => void;
}
