import { AuthProfile, TeslaLoginResponse, VehicleCommandsAuthorization } from '../entities';
import { AuthRepositoryRequirements } from '../auth.repository.requirements';
import {
  GetAuthProfileRequirements,
  GetTeslaLoginUrlRequirements,
  GetTeslaScopeChangeUrlRequirements,
  GetVehicleCommandsAuthorizationRequirements,
  DemoLoginRequirements,
} from './auth.use-cases.requirements';

export class GetTeslaLoginUrlUseCase implements GetTeslaLoginUrlRequirements {
  public constructor(private readonly repository: AuthRepositoryRequirements) {}

  public async execute(redirectUri?: string): Promise<TeslaLoginResponse> {
    return this.repository.getTeslaLoginUrl(redirectUri);
  }
}

export class GetTeslaScopeChangeUrlUseCase implements GetTeslaScopeChangeUrlRequirements {
  public constructor(private readonly repository: AuthRepositoryRequirements) {}

  public async execute(missingScopes: string[], redirectUri?: string): Promise<TeslaLoginResponse> {
    return this.repository.getTeslaScopeChangeUrl(missingScopes, redirectUri);
  }
}

export class GetAuthProfileUseCase implements GetAuthProfileRequirements {
  public constructor(private readonly repository: AuthRepositoryRequirements) {}

  public async execute(): Promise<AuthProfile> {
    return this.repository.getAuthProfile();
  }
}

export class GetVehicleCommandsAuthorizationUseCase implements GetVehicleCommandsAuthorizationRequirements {
  public constructor(private readonly repository: AuthRepositoryRequirements) {}

  public async execute(): Promise<VehicleCommandsAuthorization> {
    return this.repository.getVehicleCommandsAuthorization();
  }
}

export class DemoLoginUseCase implements DemoLoginRequirements {
  public constructor(private readonly repository: AuthRepositoryRequirements) {}

  public async execute(credentials: { email?: string; password?: string }): Promise<{ jwt: string }> {
    return this.repository.demoLogin(credentials);
  }
}
