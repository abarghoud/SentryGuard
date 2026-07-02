import { OffensiveResponse } from '../../features/vehicles/domain/entities';

export type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

export enum VehicleAction {
  ConfigureTelemetry = 'ConfigureTelemetry',
  DeleteTelemetry = 'DeleteTelemetry',
  ToggleBreakIn = 'ToggleBreakIn',
}

export type VehicleMutationAction = OffensiveResponse | VehicleAction;
