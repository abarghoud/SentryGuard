import { OffensiveResponse, Vehicle, VehicleActionResponse } from './entities';

export interface VehicleRepositoryRequirements {
  configureTelemetry(vin: string): Promise<VehicleActionResponse>;
  deleteTelemetryConfig(vin: string): Promise<VehicleActionResponse>;
  getHiddenVehicleVins(): Promise<string[]>;
  getVehicles(): Promise<Vehicle[]>;
  setVehicleHidden(vin: string, shouldHide: boolean): Promise<VehicleActionResponse>;
  toggleBreakInMonitoring(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse>;
  updateOffensiveResponse(vin: string, breakInOffensiveResponse: OffensiveResponse): Promise<VehicleActionResponse>;
}
