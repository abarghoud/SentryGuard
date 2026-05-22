import { requestApi } from './api-client';

export interface Vehicle {
  break_in_monitoring_enabled?: boolean;
  break_in_offensive_response?: string;
  created_at: string;
  display_name?: string;
  id: string;
  key_paired?: boolean;
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

export enum OffensiveResponse {
  Disabled = 'DISABLED',
  Honk = 'HONK',
}

export function getVehicles(): Promise<Vehicle[]> {
  return requestApi<Vehicle[]>('/telemetry-config/vehicles');
}

export function configureTelemetry(vin: string): Promise<VehicleActionResponse> {
  return requestApi<VehicleActionResponse>(`/telemetry-config/configure/${vin}`, {
    method: 'POST',
  });
}

export function deleteTelemetryConfig(vin: string): Promise<VehicleActionResponse> {
  return requestApi<VehicleActionResponse>(`/telemetry-config/${vin}`, {
    method: 'DELETE',
  });
}

export function toggleBreakInMonitoring(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse> {
  return requestApi<VehicleActionResponse>(
    `/telemetry-config/break-in-monitoring/${vin}/${shouldEnable ? 'enable' : 'disable'}`,
    {
      method: 'POST',
    }
  );
}

export function updateOffensiveResponse(
  vin: string,
  breakInOffensiveResponse: OffensiveResponse
): Promise<VehicleActionResponse> {
  return requestApi<VehicleActionResponse>(`/offensive-response/${vin}`, {
    body: JSON.stringify({
      break_in_offensive_response: breakInOffensiveResponse,
    }),
    method: 'PATCH',
  });
}
