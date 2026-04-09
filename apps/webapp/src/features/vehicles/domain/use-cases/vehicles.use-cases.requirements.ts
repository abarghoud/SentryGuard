import { Vehicle, TelemetryConfigResult, GenericActionResponse } from '../entities';

export interface GetVehiclesRequirements {
  execute(): Promise<Vehicle[]>;
}

export interface ConfigureTelemetryRequirements {
  execute(vin: string): Promise<TelemetryConfigResult>;
}

export interface CheckTelemetryConfigRequirements {
  execute(vin: string): Promise<TelemetryConfigResult>;
}

export interface DeleteTelemetryConfigRequirements {
  execute(vin: string): Promise<GenericActionResponse>;
}

export interface ToggleBreakInMonitoringRequirements {
  execute(vin: string, enable: boolean): Promise<GenericActionResponse>;
}
