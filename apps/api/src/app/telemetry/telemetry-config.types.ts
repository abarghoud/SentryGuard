/**
 * Delete telemetry configuration response
 */
export interface DeleteTelemetryConfigResponse {
  success: boolean;
  message: string;
}

/**
 * Telemetry configuration from Tesla API
 */
export interface TelemetryConfig {
  config: {
    hostname: string;
    ca: string;
    fields: {
      [key: string]: {
        interval_seconds: number;
      };
    };
    [key: string]: unknown;
  } | null;
  key_paired?: boolean;
  [key: string]: unknown;
}

/**
 * Telemetry configuration request payload
 */
export interface TelemetryConfigRequest {
  config: {
    ca: string;
    hostname: string;
    port: number;
    fields: Record<string, { interval_seconds: number }>;
  };
  vins: string[];
}

/**
 * Tesla API generic response wrapper
 */
export interface TeslaApiResponse<T = unknown> {
  response: T;
  [key: string]: unknown;
}

export interface SkippedVehicle {
  vin: string;
  reason: SkippedVehicleReason;
}

export type SkippedVehicleReason =
  | 'missing_key'
  | 'unsupported_hardware'
  | 'unsupported_firmware'
  | 'max_configs'
  | string;

export type SkippedVehiclesMap = Partial<Record<SkippedVehicleReason, string[]>>;

export interface FleetTelemetryConfigResponse {
  skipped_vehicles?: SkippedVehiclesMap;
  [key: string]: unknown;
}

export interface ConfigureTelemetryResult {
  success: boolean;
  skippedVehicle?: SkippedVehicle | null;
  response?: TeslaApiResponse<FleetTelemetryConfigResponse>;
}

export interface TeslaVehicle {
  vin: string;
  display_name: string;
  vehicle_state?: {
    car_type?: string;
  };
}

export interface TeslaVehicleWithStatus extends TeslaVehicle {
  sentry_mode_monitoring_enabled: boolean;
  key_paired: boolean;
  break_in_monitoring_enabled?: boolean;
  offensive_response?: string;
}
