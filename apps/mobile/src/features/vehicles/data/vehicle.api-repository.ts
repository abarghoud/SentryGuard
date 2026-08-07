import { ApiClientRequirements } from '../../../core/api/api-client';
import { OffensiveResponse, Vehicle, VehicleActionResponse } from '../domain/entities';
import { VehicleRepositoryRequirements } from '../domain/vehicle.repository.requirements';

export class VehicleApiRepository implements VehicleRepositoryRequirements {
  public constructor(private readonly client: ApiClientRequirements) {}

  public async getVehicles(): Promise<Vehicle[]> {
    return this.client.request<Vehicle[]>('/telemetry-config/vehicles');
  }

  public async configureTelemetry(vin: string): Promise<VehicleActionResponse> {
    return this.client.request<VehicleActionResponse>(`/telemetry-config/configure/${vin}`, {
      method: 'POST',
    });
  }

  public async deleteTelemetryConfig(vin: string): Promise<VehicleActionResponse> {
    return this.client.request<VehicleActionResponse>(`/telemetry-config/${vin}`, {
      method: 'DELETE',
    });
  }

  public async toggleBreakInMonitoring(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse> {
    return this.client.request<VehicleActionResponse>(
      `/telemetry-config/break-in-monitoring/${vin}/${shouldEnable ? 'enable' : 'disable'}`,
      { method: 'POST' }
    );
  }

  public async updateOffensiveResponse(
    vin: string,
    payload: { breakInOffensiveResponse?: OffensiveResponse; autoSentryEnabled?: boolean },
  ): Promise<VehicleActionResponse> {
    return this.client.request<VehicleActionResponse>(`/offensive-response/${vin}`, {
      body: JSON.stringify({
        ...(payload.breakInOffensiveResponse !== undefined
          ? { break_in_offensive_response: payload.breakInOffensiveResponse }
          : {}),
        ...(payload.autoSentryEnabled !== undefined
          ? { break_in_auto_sentry_mode_enabled: payload.autoSentryEnabled }
          : {}),
      }),
      method: 'PATCH',
    });
  }
}
