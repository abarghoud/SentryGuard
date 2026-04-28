export interface Vehicle {
  id: string;
  vin: string;
  display_name?: string;
  model?: string;
  sentry_mode_monitoring_enabled: boolean;
  break_in_monitoring_enabled?: boolean;
  offensive_response?: string;
  key_paired?: boolean;
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
