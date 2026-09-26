import { OffensiveResponse, Vehicle, VehicleActionResponse } from './entities';

export interface VehicleRepositoryRequirements {
  configureTelemetry(vin: string): Promise<VehicleActionResponse>;
  deleteTelemetryConfig(vin: string): Promise<VehicleActionResponse>;
  getVehicles(): Promise<Vehicle[]>;
  toggleBreakInMonitoring(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse>;
  updateAlertSounds(
    vin: string,
    payload: { breakInAlertSound?: string; sentryAlertSound?: string },
  ): Promise<VehicleActionResponse>;
  updateOffensiveResponse(
    vin: string,
    payload: { breakInOffensiveResponse?: OffensiveResponse; autoSentryEnabled?: boolean },
  ): Promise<VehicleActionResponse>;
}
