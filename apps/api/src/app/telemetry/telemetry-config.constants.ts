/**
 * Default Tesla API base URL
 * Points to the local tesla-vehicle-command proxy service
 */
export const DEFAULT_TESLA_API_BASE_URL =
  'https://tesla-vehicle-command:443';

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  ERROR_CHECKING_CONFIG: (vin: string) => `Error checking config for ${vin}:`,
  ERROR_CONFIGURING_VIN: (vin: string) => `Error for VIN ${vin}:`,
  ERROR_DELETING_CONFIG: (vin: string) => `❌ Error deleting config for ${vin}:`,
  ERROR_FETCHING_VEHICLES: 'Error fetching vehicles:',
  HOSTNAME_NOT_DEFINED: '❌ TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME not defined',
  INVALID_TOKEN: 'Invalid or expired token for this user',
  LETS_ENCRYPT_NOT_DEFINED: '❌ LETS_ENCRYPT_CERTIFICATE not defined',
} as const;

/**
 * Generic error messages
 */
export const GENERIC_ERROR_MESSAGES = {
  ERROR_DELETING_TELEMETRY: 'Error deleting telemetry configuration',
} as const;

/**
 * Info messages
 */
export const INFO_MESSAGES = {
  CONFIGURING_VIN: (vin: string) => `\n🚗 Configuring ${vin}...`,
  FETCHING_VEHICLES: '🔍 Fetching vehicles...',
  NO_CONFIG_FOUND: (vin: string) =>
    `ℹ️ No configuration found for ${vin} (already deleted)`,
  NO_CONFIG_FOUND_ALREADY_DELETED: 'No telemetry configuration found (already deleted)',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  CONFIG_DELETED: (vin: string) => `✅ Telemetry config deleted for ${vin}`,
  CONFIG_DELETED_SUCCESSFULLY: 'Telemetry configuration deleted successfully',
  CONFIG_VERIFIED: (vin: string) => `✅ Configuration verified for ${vin}:`,
  TELEMETRY_CONFIGURED: (vin: string) => `✅ Telemetry configured for VIN: ${vin}`,
  TELEMETRY_STATUS_UPDATED: (vin: string, enabled: boolean) =>
    `✅ Telemetry status updated for ${vin}: ${enabled}`,
  VEHICLE_ADDED: (vin: string, telemetryEnabled: boolean) =>
    `✅ Vehicle added to DB: ${vin} (telemetry: ${telemetryEnabled})`,
  VEHICLE_UPDATED: (vin: string, telemetryEnabled: boolean) =>
    `✅ Vehicle updated: ${vin} (telemetry: ${telemetryEnabled})`,
} as const;

/**
 * Telemetry configuration constants
 */
export const TELEMETRY_CONFIG = {
  DEFAULT_SENTRY_MODE_INTERVAL: 30,
  FIELD_NAME: 'SentryMode',
  PORT: 12345,
} as const;

/**
 * Tesla Fleet API endpoints
 */
export const TESLA_API_ENDPOINTS = {
  FLEET_TELEMETRY_CONFIG: '/api/1/vehicles/fleet_telemetry_config',
  VEHICLE_TELEMETRY_CONFIG: (vin: string) =>
    `/api/1/vehicles/${vin}/fleet_telemetry_config`,
  VEHICLES: '/api/1/vehicles',
} as const;

/**
 * Warning messages
 */
export const WARNING_MESSAGES = {
  NO_VEHICLES_FOUND: '⚠️ No vehicles found.',
} as const;
