import { Vehicle, TelemetryConfigResult, GenericActionResponse } from './entities';

export interface VehicleRepositoryRequirements {
  getVehicles(): Promise<Vehicle[]>;
  configureTelemetry(vin: string): Promise<TelemetryConfigResult>;
  checkTelemetryConfig(vin: string): Promise<TelemetryConfigResult>;
  deleteTelemetryConfig(vin: string): Promise<GenericActionResponse>;
  toggleBreakInMonitoring(vin: string, enable: boolean): Promise<GenericActionResponse>;
  updateOffensiveResponse(vin: string, offensiveResponse: string): Promise<GenericActionResponse>;
  testOffensiveResponse(vin: string): Promise<GenericActionResponse>;
}
