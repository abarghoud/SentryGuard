import { AuthProfile, TeslaLoginResponse, VehicleCommandsAuthorization } from './entities';

export interface AuthRepositoryRequirements {
  getAuthProfile(): Promise<AuthProfile>;
  getTeslaLoginUrl(redirectUri?: string): Promise<TeslaLoginResponse>;
  getTeslaScopeChangeUrl(missingScopes: string[], redirectUri?: string): Promise<TeslaLoginResponse>;
  getVehicleCommandsAuthorization(): Promise<VehicleCommandsAuthorization>;
}
