import { create } from 'zustand';
import { Vehicle } from '../../domain/entities';
import { hasToken } from '../../../../core/api/token-manager';

import {
  GetVehiclesRequirements,
  ConfigureTelemetryRequirements,
  DeleteTelemetryConfigRequirements,
  ToggleBreakInMonitoringRequirements,
} from '../../domain/use-cases/vehicles.use-cases.requirements';

export interface VehiclesStoreDependencies {
  getVehiclesUseCase: GetVehiclesRequirements;
  configureTelemetryUseCase: ConfigureTelemetryRequirements;
  deleteTelemetryConfigUseCase: DeleteTelemetryConfigRequirements;
  toggleBreakInMonitoringUseCase: ToggleBreakInMonitoringRequirements;
}

export interface VehiclesState {
  vehicles: Vehicle[];
  isLoading: boolean;
  error: string | null;

  fetchVehicles: () => Promise<void>;
  configureTelemetryForVehicle: (vin: string) => Promise<{
    success: boolean;
    message?: string;
    skippedVehicle?: { vin: string; reason: string; details?: string } | null;
  }>;
  deleteTelemetryForVehicle: (vin: string) => Promise<boolean>;
  toggleBreakInMonitoringForVehicle: (vin: string, enable: boolean) => Promise<boolean>;
}

export const createVehiclesStore = (deps: VehiclesStoreDependencies) => create<VehiclesState>((set, get) => ({
  vehicles: [],
  isLoading: true,
  error: null,

  fetchVehicles: async () => {
    if (!hasToken()) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await deps.getVehiclesUseCase.execute();
      set({ vehicles: data, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch vehicles',
        isLoading: false,
      });
    }
  },

  configureTelemetryForVehicle: async (vin: string) => {
    try {
      const response = await deps.configureTelemetryUseCase.execute(vin);
      const skippedVehicle = response?.result?.skippedVehicle ?? null;
      const success = response?.result?.success === true && !skippedVehicle;

      if (success) {
        await get().fetchVehicles();
        return { success: true };
      }

      const message =
        response?.message ||
        (skippedVehicle
          ? 'Telemetry configuration skipped for this vehicle'
          : 'Failed to configure telemetry');

      return { success: false, message, skippedVehicle };
    } catch (err) {
      console.error('Failed to configure telemetry:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to configure telemetry' });
      return { success: false, message: err instanceof Error ? err.message : undefined };
    }
  },

  deleteTelemetryForVehicle: async (vin: string) => {
    try {
      const result = await deps.deleteTelemetryConfigUseCase.execute(vin);
      if (result.success) {
        await get().fetchVehicles();
        return true;
      }
      set({ error: result.message });
      return false;
    } catch (err) {
      console.error('Failed to delete telemetry config:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to delete telemetry configuration' });
      return false;
    }
  },

  toggleBreakInMonitoringForVehicle: async (vin: string, enable: boolean) => {
    try {
      const result = await deps.toggleBreakInMonitoringUseCase.execute(vin, enable);
      if (result.success) {
        await get().fetchVehicles();
        return true;
      }
      set({ error: result.message });
      return false;
    } catch (err) {
      console.error('Failed to toggle break-in monitoring:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to toggle break-in monitoring' });
      return false;
    }
  },
}));
