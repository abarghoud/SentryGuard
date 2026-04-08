import { AuthRepositoryRequirements } from '../auth.repository.requirements';
import { LoginUrlResponse, AuthStatus, UserProfile } from '../entities';

export class GetLoginUrlUseCase {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<LoginUrlResponse> {
    return this.repository.getLoginUrl();
  }
}

export class GetScopeChangeUrlUseCase {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(missingScopes?: string[]): Promise<LoginUrlResponse> {
    return this.repository.getScopeChangeUrl(missingScopes);
  }
}

export class CheckAuthStatusUseCase {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<AuthStatus> {
    return this.repository.checkAuthStatus();
  }
}

export class GetUserProfileUseCase {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<UserProfile | null> {
    return this.repository.getUserProfile();
  }
}

export class ValidateTokenUseCase {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<boolean> {
    return this.repository.validateToken();
  }
}

export class LogoutUseCase {
  constructor(private repository: AuthRepositoryRequirements) {}

  async execute(): Promise<void> {
    return this.repository.logout();
  }
}
