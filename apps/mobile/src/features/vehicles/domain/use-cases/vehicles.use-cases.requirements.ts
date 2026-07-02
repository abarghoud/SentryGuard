import { OffensiveResponse, Vehicle, VehicleActionResponse } from '../entities';

export interface GetVehiclesRequirements {
  execute(): Promise<Vehicle[]>;
}

export interface ConfigureTelemetryRequirements {
  execute(vin: string): Promise<VehicleActionResponse>;
}

export interface DeleteTelemetryConfigRequirements {
  execute(vin: string): Promise<VehicleActionResponse>;
}

export interface ToggleBreakInMonitoringRequirements {
  execute(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse>;
}

export interface UpdateOffensiveResponseRequirements {
  execute(vin: string, breakInOffensiveResponse: OffensiveResponse): Promise<VehicleActionResponse>;
}
