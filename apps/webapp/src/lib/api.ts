/**
 * JWT-based API client for TeslaGuard
 * All authenticated requests use JWT tokens via Authorization header
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ============ Token Management ============

/**
 * Get JWT token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jwt_token');
}

/**
 * Save JWT token to localStorage
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('jwt_token', token);
}

/**
 * Remove JWT token from localStorage
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('jwt_token');
}

/**
 * Check if user has a token (basic check)
 */
export function hasToken(): boolean {
  return !!getToken();
}

// ============ API Request Helper ============

export class ApiError extends Error {
  constructor(message: string, public status?: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make an authenticated API request with JWT token
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add JWT token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      clearToken();
      // Redirect to login if we're in the browser
      if (typeof window !== 'undefined') {
        window.location.href = '/?expired=true';
      }
      throw new ApiError('Authentication expired. Please log in again.', 401);
    }

    if (!response.ok) {
      let errorMessage = `API Error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        throw new ApiError(errorMessage, response.status, errorData);
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(errorMessage, response.status);
      }
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return {} as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

// ============ Auth API ============

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
  profile_image_url?: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  message?: string;
}

/**
 * Get Tesla OAuth login URL
 */
export async function getLoginUrl(): Promise<LoginUrlResponse> {
  return apiRequest('/auth/tesla/login');
}

/**
 * Check authentication status (requires JWT)
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
  return apiRequest('/auth/status');
}

/**
 * Get user profile (requires JWT)
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      profile: UserProfile;
    }>('/auth/profile');
    return response.success ? response.profile : null;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}

/**
 * Validate JWT token
 */
export async function validateToken(): Promise<boolean> {
  try {
    const response = await apiRequest<ValidateTokenResponse>('/auth/validate');
    return response.valid;
  } catch (error) {
    return false;
  }
}

/**
 * Logout (revoke JWT token)
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearToken();
  }
}

/**
 * Get auth service statistics
 */
export async function getAuthStats(): Promise<{
  activeUsers: number;
  pendingStates: number;
  activeJwtTokens: number;
}> {
  return apiRequest('/auth/stats');
}

// ============ Vehicles API ============

export interface Vehicle {
  id: string;
  vin: string;
  display_name?: string;
  model?: string;
  telemetry_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's vehicles (requires JWT)
 */
export async function getVehicles(): Promise<Vehicle[]> {
  try {
    return await apiRequest('/telemetry-config/vehicles');
  } catch (error) {
    console.error('Failed to get vehicles:', error);
    return [];
  }
}

/**
 * Configure telemetry for a specific vehicle (requires JWT)
 */
export async function configureTelemetry(vin: string): Promise<{
  message: string;
  result: any;
}> {
  return apiRequest(`/telemetry-config/configure/${vin}`, {
    method: 'POST',
  });
}

/**
 * Configure telemetry for all vehicles (requires JWT)
 */
export async function configureAllVehicles(): Promise<{
  message: string;
}> {
  return apiRequest('/telemetry-config/configure-all', {
    method: 'POST',
  });
}

/**
 * Check telemetry configuration for a vehicle (requires JWT)
 */
export async function checkTelemetryConfig(vin: string): Promise<{
  message: string;
  result: any;
}> {
  return apiRequest(`/telemetry-config/check/${vin}`);
}

// ============ Telegram API ============

export interface TelegramLinkInfo {
  success: boolean;
  link: string;
  token: string;
  expires_at: string;
  expires_in_minutes: number;
}

export interface TelegramStatus {
  linked: boolean;
  status: 'not_configured' | 'pending' | 'linked' | 'expired';
  linked_at?: string;
  expires_at?: string;
  message: string;
}

/**
 * Generate Telegram linking URL (requires JWT)
 */
export async function generateTelegramLink(): Promise<TelegramLinkInfo> {
  return apiRequest('/telegram/generate-link', {
    method: 'POST',
  });
}

/**
 * Get Telegram link status (requires JWT)
 */
export async function getTelegramStatus(): Promise<TelegramStatus> {
  return apiRequest('/telegram/status');
}

/**
 * Unlink Telegram account (requires JWT)
 */
export async function unlinkTelegram(): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/telegram/unlink', {
    method: 'DELETE',
  });
}

/**
 * Send test message via Telegram (requires JWT)
 */
export async function sendTestMessage(message?: string): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/telegram/test-message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/**
 * Cleanup expired Telegram tokens (requires JWT)
 */
export async function cleanupExpiredTelegramTokens(): Promise<{
  success: boolean;
  deleted: number;
  message: string;
}> {
  return apiRequest('/telegram/cleanup-expired', {
    method: 'POST',
  });
}
