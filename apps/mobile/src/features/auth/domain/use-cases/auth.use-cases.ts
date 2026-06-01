import { AuthProfile, TeslaLoginResponse, VehicleCommandsAuthorization } from '../entities';
import { AuthRepositoryRequirements } from '../auth.repository.requirements';
import {
  GetAuthProfileRequirements,
  GetTeslaLoginUrlRequirements,
  GetTeslaScopeChangeUrlRequirements,
  GetVehicleCommandsAuthorizationRequirements,
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
