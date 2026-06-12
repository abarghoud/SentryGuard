export interface TeslaLoginResponse {
  message: string;
  state: string;
  url: string;
}

export interface AuthProfile {
  profile: {
    email?: string;
    full_name?: string;
    isBetaTester: boolean;
    userId: string;
  };
  success: boolean;
}

export interface VehicleCommandsAuthorization {
  authorized: boolean;
}
