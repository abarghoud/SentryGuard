/**
 * Client API pour communiquer avec le backend TeslaGuard
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Récupère le userId depuis le localStorage
 */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userId');
}

/**
 * Sauvegarde le userId dans le localStorage
 */
export function setUserId(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('userId', userId);
}

/**
 * Supprime le userId du localStorage
 */
export function clearUserId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('userId');
}

/**
 * Effectue une requête API avec gestion automatique du userId
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const userId = getUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// ============ Auth API ============

export interface AuthStatus {
  authenticated: boolean;
  expires_at?: string;
  created_at?: string;
  has_profile?: boolean;
  message: string;
}

export interface UserProfile {
  email?: string;
  full_name?: string;
  profile_image_url?: string;
}

/**
 * Génère une URL de connexion Tesla
 */
export async function getLoginUrl(): Promise<{ url: string; state: string }> {
  return apiRequest('/auth/tesla/login');
}

/**
 * Vérifie le statut d'authentification de l'utilisateur
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
  const userId = getUserId();
  if (!userId) {
    return { authenticated: false, message: 'No user ID found' };
  }
  return apiRequest(`/auth/user/${userId}/status`);
}

/**
 * Récupère le profil de l'utilisateur
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const userId = getUserId();
  if (!userId) return null;

  const response = await apiRequest<{ success: boolean; profile?: UserProfile }>(
    `/auth/user/${userId}/profile`
  );

  return response.success ? response.profile || null : null;
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
 * Récupère la liste des véhicules de l'utilisateur
 */
export async function getVehicles(): Promise<Vehicle[]> {
  return apiRequest('/telemetry-config/vehicles');
}

/**
 * Configure la télémétrie pour un véhicule spécifique
 */
export async function configureTelemetry(vin: string): Promise<any> {
  return apiRequest(`/telemetry-config/configure/${vin}`, {
    method: 'POST',
  });
}

/**
 * Configure la télémétrie pour tous les véhicules
 */
export async function configureAllVehicles(): Promise<any> {
  return apiRequest('/telemetry-config/configure-all', {
    method: 'POST',
  });
}

/**
 * Vérifie la configuration de télémétrie d'un véhicule
 */
export async function checkTelemetryConfig(vin: string): Promise<any> {
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
 * Génère un lien de liaison Telegram
 */
export async function generateTelegramLink(): Promise<TelegramLinkInfo> {
  return apiRequest('/telegram/generate-link', {
    method: 'POST',
  });
}

/**
 * Vérifie le statut de la liaison Telegram
 */
export async function getTelegramStatus(): Promise<TelegramStatus> {
  return apiRequest('/telegram/status');
}

/**
 * Dissocier le compte Telegram
 */
export async function unlinkTelegram(): Promise<{ success: boolean; message: string }> {
  return apiRequest('/telegram/unlink', {
    method: 'DELETE',
  });
}

/**
 * Envoie un message de test
 */
export async function sendTestMessage(message?: string): Promise<{ success: boolean; message: string }> {
  return apiRequest('/telegram/test-message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

