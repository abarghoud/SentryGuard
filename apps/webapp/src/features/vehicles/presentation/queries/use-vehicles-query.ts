import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfigureTelemetryOutcome, TelemetryConfigResult, Vehicle } from '../../domain/entities';
import { hasToken } from '../../../../core/api/token-manager';
import {
  GetVehiclesRequirements,
  ConfigureTelemetryRequirements,
  DeleteTelemetryConfigRequirements,
  ToggleBreakInMonitoringRequirements,
  UpdateOffensiveResponseRequirements,
} from '../../domain/use-cases/vehicles.use-cases.requirements';

export interface VehiclesQueryDependencies {
  getVehiclesUseCase: GetVehiclesRequirements;
  configureTelemetryUseCase: ConfigureTelemetryRequirements;
  deleteTelemetryConfigUseCase: DeleteTelemetryConfigRequirements;
  toggleBreakInMonitoringUseCase: ToggleBreakInMonitoringRequirements;
  updateOffensiveResponseUseCase: UpdateOffensiveResponseRequirements;
}

const resolveErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const resolveConfigureTelemetryOutcome = (
  response: TelemetryConfigResult
): ConfigureTelemetryOutcome => {
  const skippedVehicle = response?.result?.skippedVehicle ?? null;

  if (response?.result?.success === true && !skippedVehicle) {
    return { success: true };
  }

  const message =
    response?.message ||
    (skippedVehicle
      ? 'Telemetry configuration skipped for this vehicle'
      : 'Failed to configure telemetry');

  return { success: false, message, skippedVehicle };
};

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
    mutationFn: async (vin: string): Promise<ConfigureTelemetryOutcome> => {
      try {
        return resolveConfigureTelemetryOutcome(
          await deps.configureTelemetryUseCase.execute(vin)
        );
      } catch (error: unknown) {
        return {
          success: false,
          message: resolveErrorMessage(error, 'Failed to configure telemetry'),
          skippedVehicle: null,
        };
      }
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

  const updateOffensiveResponseMutation = useMutation({
    mutationFn: async ({ vin, breakInResponse }: { vin: string; breakInResponse?: string }) => {
      const result = await deps.updateOffensiveResponseUseCase.execute(vin, breakInResponse);
      if (!result.success) throw new Error(result.message);
      return result;
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
    updateOffensiveResponseMutation,
  };
};