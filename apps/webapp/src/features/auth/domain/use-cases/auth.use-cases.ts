import { AuthRepositoryRequirements } from '../auth.repository.requirements';
import { LoginUrlResponse, AuthStatus, UserProfile } from '../entities';
import {
  GetLoginUrlRequirements,
  GetScopeChangeUrlRequirements,
  CheckAuthStatusRequirements,
  GetUserProfileRequirements,
  ValidateTokenRequirements,
  LogoutRequirements,
} from './auth.use-cases.requirements';

export class GetLoginUrlUseCase implements GetLoginUrlRequirements {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<LoginUrlResponse> {
    return this.repository.getLoginUrl();
  }
}

export class GetScopeChangeUrlUseCase implements GetScopeChangeUrlRequirements {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(missingScopes?: string[]): Promise<LoginUrlResponse> {
    return this.repository.getScopeChangeUrl(missingScopes);
  }
}

export class CheckAuthStatusUseCase implements CheckAuthStatusRequirements {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<AuthStatus> {
    return this.repository.checkAuthStatus();
  }
}

export class GetUserProfileUseCase implements GetUserProfileRequirements {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<UserProfile | null> {
    return this.repository.getUserProfile();
  }
}

export class ValidateTokenUseCase implements ValidateTokenRequirements {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<boolean> {
    return this.repository.validateToken();
  }
}

export class LogoutUseCase implements LogoutRequirements {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<void> {
    return this.repository.logout();
  }
}
