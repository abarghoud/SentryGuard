import { LoginUrlResponse, AuthStatus, UserProfile } from '../entities';

export interface GetLoginUrlRequirements {
  execute(): Promise<LoginUrlResponse>;
}

export interface GetScopeChangeUrlRequirements {
  execute(missingScopes?: string[]): Promise<LoginUrlResponse>;
}

export interface CheckAuthStatusRequirements {
  execute(): Promise<AuthStatus>;
}

export interface GetUserProfileRequirements {
  execute(): Promise<UserProfile | null>;
}

export interface ValidateTokenRequirements {
  execute(): Promise<boolean>;
}

export interface LogoutRequirements {
  execute(): Promise<void>;
}
