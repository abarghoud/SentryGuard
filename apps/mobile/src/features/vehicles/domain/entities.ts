export enum OffensiveResponse {
  Disabled = 'DISABLED',
  Honk = 'HONK',
  Fart = 'FART',
}

export interface Vehicle {
  break_in_monitoring_enabled?: boolean;
  break_in_offensive_response?: string;
  break_in_auto_sentry_mode_enabled?: boolean;
  created_at: string;
  display_name?: string;
  id: string;
  key_paired?: boolean;
  vehicle_command_protocol_required?: boolean;
  model?: string;
  sentry_mode_monitoring_enabled: boolean;
  updated_at: string;
  vin: string;
}

export interface VehicleActionResponse {
  message: string;
  result?: {
    skippedVehicle?: {
      details?: string;
      reason: string;
      vin: string;
    } | null;
    success?: boolean;
  };
  success?: boolean;
}
