export interface LoginUrlResponse {
  url: string;
  state: string;
  message: string;
}

export interface AuthStatus {
  authenticated: boolean;
  userId: string;
  email?: string;
  expires_at?: string;
  jwt_expires_at?: string;
  created_at?: string;
  has_profile?: boolean;
  message: string;
}

export interface UserProfile {
  userId: string;
  email?: string;
  full_name?: string;
  isBetaTester?: boolean;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  message?: string;
}
