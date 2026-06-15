import { OffensiveResponse, Vehicle, VehicleActionResponse } from '../domain/entities';
import { VehicleRepositoryRequirements } from '../domain/vehicle.repository.requirements';

export class VehicleMockRepository implements VehicleRepositoryRequirements {
  private vehicles: Vehicle[] = [
    {
      id: 'demo-vehicle-id',
      vin: '5YJ3E1EA8KF123456',
      display_name: 'Model 3 - Demo',
      sentry_mode_monitoring_enabled: true,
      break_in_monitoring_enabled: true,
      break_in_offensive_response: OffensiveResponse.Disabled,
      key_paired: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public async getVehicles(): Promise<Vehicle[]> {
    return [...this.vehicles];
  }

  public async configureTelemetry(vin: string): Promise<VehicleActionResponse> {
    const v = this.vehicles.find((vehicle) => vehicle.vin === vin);
    if (v) {
      v.sentry_mode_monitoring_enabled = true;
    }
    return { message: 'success', success: true };
  }

  public async deleteTelemetryConfig(vin: string): Promise<VehicleActionResponse> {
    const v = this.vehicles.find((vehicle) => vehicle.vin === vin);
    if (v) {
      v.sentry_mode_monitoring_enabled = false;
    }
    return { message: 'success', success: true };
  }

  public async toggleBreakInMonitoring(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse> {
    const v = this.vehicles.find((vehicle) => vehicle.vin === vin);
    if (v) {
      v.break_in_monitoring_enabled = shouldEnable;
    }
    return { message: 'success', success: true };
  }

  public async updateOffensiveResponse(vin: string, response: OffensiveResponse): Promise<VehicleActionResponse> {
    const v = this.vehicles.find((vehicle) => vehicle.vin === vin);
    if (v) {
      v.break_in_offensive_response = response;
    }
    return { message: 'success', success: true };
  }
}
