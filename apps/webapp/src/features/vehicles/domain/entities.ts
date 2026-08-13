export interface Vehicle {
  id: string;
  vin: string;
  display_name?: string;
  model?: string;
  sentry_mode_monitoring_enabled: boolean;
  break_in_monitoring_enabled?: boolean;
  break_in_offensive_response?: string;
  break_in_auto_sentry_mode_enabled?: boolean;
  key_paired?: boolean;
  vehicle_command_protocol_required?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TelemetryConfigResult {
  message: string;
  result: any;
}

export interface GenericActionResponse {
  success: boolean;
  message: string;
}

export interface SkippedVehicle {
  vin: string;
  reason: string;
  details?: string;
}

export interface VehicleActionOutcome {
  success: boolean;
  message?: string;
}

export interface ConfigureTelemetryOutcome extends VehicleActionOutcome {
  skippedVehicle?: SkippedVehicle | null;
}
