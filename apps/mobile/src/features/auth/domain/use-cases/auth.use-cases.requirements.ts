import { AuthProfile, TeslaLoginResponse, VehicleCommandsAuthorization } from '../entities';

export interface GetTeslaLoginUrlRequirements {
  execute(redirectUri?: string): Promise<TeslaLoginResponse>;
}

export interface GetTeslaScopeChangeUrlRequirements {
  execute(missingScopes: string[], redirectUri?: string): Promise<TeslaLoginResponse>;
}

export interface GetAuthProfileRequirements {
  execute(): Promise<AuthProfile>;
}

export interface GetVehicleCommandsAuthorizationRequirements {
  execute(): Promise<VehicleCommandsAuthorization>;
}

export interface DemoLoginRequirements {
  execute(credentials: { email?: string; password?: string }): Promise<{ jwt: string }>;
}
