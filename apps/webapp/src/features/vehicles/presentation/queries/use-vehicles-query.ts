import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Vehicle } from '../../domain/entities';
import { hasToken } from '../../../../core/api/token-manager';
import {
  GetVehiclesRequirements,
  ConfigureTelemetryRequirements,
  DeleteTelemetryConfigRequirements,
  ToggleBreakInMonitoringRequirements,
} from '../../domain/use-cases/vehicles.use-cases.requirements';

export interface VehiclesQueryDependencies {
  getVehiclesUseCase: GetVehiclesRequirements;
  configureTelemetryUseCase: ConfigureTelemetryRequirements;
  deleteTelemetryConfigUseCase: DeleteTelemetryConfigRequirements;
  toggleBreakInMonitoringUseCase: ToggleBreakInMonitoringRequirements;
}

export const createUseVehiclesQuery = (deps: VehiclesQueryDependencies) => () => {
  const queryClient = useQueryClient();

  const query = useQuery<Vehicle[], Error>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      if (!hasToken()) {
        return [];
      }
      return deps.getVehiclesUseCase.execute();
    },
  });

  const configureTelemetryMutation = useMutation({
    mutationFn: async (vin: string) => {
      const response = await deps.configureTelemetryUseCase.execute(vin);
      const skippedVehicle = response?.result?.skippedVehicle ?? null;
      const success = response?.result?.success === true && !skippedVehicle;

      if (success) {
        return { success: true };
      }

      const message =
        response?.message ||
        (skippedVehicle
          ? 'Telemetry configuration skipped for this vehicle'
          : 'Failed to configure telemetry');

      return { success: false, message, skippedVehicle };
    },
    onSuccess: (data) => {
      if (data.success) {
        return queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }
      return Promise.resolve();
    },
  });

  const deleteTelemetryMutation = useMutation({
    mutationFn: async (vin: string) => {
      const result = await deps.deleteTelemetryConfigUseCase.execute(vin);
      if (!result.success) throw new Error(result.message);
      return true;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const toggleBreakInMutation = useMutation({
    mutationFn: async ({ vin, enable }: { vin: string; enable: boolean }) => {
      const result = await deps.toggleBreakInMonitoringUseCase.execute(vin, enable);
      if (!result.success) throw new Error(result.message);
      return true;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  return {
    query,
    configureTelemetryMutation,
    deleteTelemetryMutation,
    toggleBreakInMutation,
  };
};
