import { VehicleRepositoryRequirements } from '../domain/vehicle.repository.requirements';
import { Vehicle, TelemetryConfigResult, GenericActionResponse } from '../domain/entities';
import { ApiClientRequirements } from '../../../core/api/api-client';

export class VehicleApiRepository implements VehicleRepositoryRequirements {
  constructor(private client: ApiClientRequirements) {}

  async getVehicles(): Promise<Vehicle[]> {
    try {
      return await this.client.request<Vehicle[]>('/telemetry-config/vehicles');
    } catch (error) {
      console.error('Failed to get vehicles:', error);
      return [];
    }
  }

  async configureTelemetry(vin: string): Promise<TelemetryConfigResult> {
    return this.client.request<TelemetryConfigResult>(`/telemetry-config/configure/${vin}`, {
      method: 'POST',
    });
  }

  async checkTelemetryConfig(vin: string): Promise<TelemetryConfigResult> {
    return this.client.request<TelemetryConfigResult>(`/telemetry-config/check/${vin}`);
  }

  async deleteTelemetryConfig(vin: string): Promise<GenericActionResponse> {
    return this.client.request<GenericActionResponse>(`/telemetry-config/${vin}`, {
      method: 'DELETE',
    });
  }

  async toggleBreakInMonitoring(vin: string, enable: boolean): Promise<GenericActionResponse> {
    return this.client.request<GenericActionResponse>(
      `/telemetry-config/break-in-monitoring/${vin}/${enable ? 'enable' : 'disable'}`,
      { method: 'POST' }
    );
  }

  async updateOffensiveResponse(vin: string, offensiveResponse: string): Promise<GenericActionResponse> {
    return this.client.request<GenericActionResponse>(`/telemetry-config/${vin}/offensive-response`, {
      method: 'PATCH',
      body: JSON.stringify({ offensive_response: offensiveResponse }),
    });
  }

  async testOffensiveResponse(vin: string): Promise<GenericActionResponse> {
    return this.client.request<GenericActionResponse>(`/telemetry-config/${vin}/test-offensive`, {
      method: 'POST',
    });
  }
}
