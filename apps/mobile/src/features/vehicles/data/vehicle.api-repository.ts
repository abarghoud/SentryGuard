import { ApiClientRequirements } from '../../../core/api/api-client';
import { InstallationStoreRequirements } from '../../../core/api/installation-store';
import { OffensiveResponse, Vehicle, VehicleActionResponse } from '../domain/entities';
import { VehicleRepositoryRequirements } from '../domain/vehicle.repository.requirements';

export class VehicleApiRepository implements VehicleRepositoryRequirements {
  public constructor(
    private readonly client: ApiClientRequirements,
    private readonly installationStore: InstallationStoreRequirements
  ) {}

  public async getHiddenVehicleVins(): Promise<string[]> {
    const installationId = await this.installationStore.getInstallationId();
    return this.client.request<string[]>(`/devices/${installationId}/hidden-vehicles`);
  }

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

  public async setVehicleHidden(vin: string, shouldHide: boolean): Promise<VehicleActionResponse> {
    const installationId = await this.installationStore.getInstallationId();
    if (shouldHide) {
      return this.client.request<VehicleActionResponse>(`/devices/${installationId}/hidden-vehicles`, {
        body: JSON.stringify({ vin }),
        method: 'POST',
      });
    }

    return this.client.request<VehicleActionResponse>(`/devices/${installationId}/hidden-vehicles/${vin}`, {
      method: 'DELETE',
    });
  }

  public async toggleBreakInMonitoring(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse> {
    return this.client.request<VehicleActionResponse>(
      `/telemetry-config/break-in-monitoring/${vin}/${shouldEnable ? 'enable' : 'disable'}`,
      { method: 'POST' }
    );
  }

  public async updateOffensiveResponse(vin: string, breakInOffensiveResponse: OffensiveResponse): Promise<VehicleActionResponse> {
    return this.client.request<VehicleActionResponse>(`/offensive-response/${vin}`, {
      body: JSON.stringify({
        break_in_offensive_response: breakInOffensiveResponse,
      }),
      method: 'PATCH',
    });
  }
}
