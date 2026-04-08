import { useState, useCallback, useEffect } from 'react';
import { Vehicle } from '../../domain/entities';
import {
  getVehiclesUseCase,
  toggleBreakInMonitoringUseCase,
  configureTelemetryUseCase,
  deleteTelemetryConfigUseCase,
} from '../../di';
import { hasToken } from '../../../../core/api/token-manager';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    if (!hasToken()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getVehiclesUseCase.execute();
      setVehicles(data);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const configureTelemetryForVehicle = useCallback(async (
    vin: string
  ): Promise<{
    success: boolean;
    message?: string;
    skippedVehicle?: { vin: string; reason: string; details?: string } | null;
  }> => {
    try {
      const response = await configureTelemetryUseCase.execute(vin);
      const skippedVehicle = response?.result?.skippedVehicle ?? null;
      const success = response?.result?.success === true && !skippedVehicle;

      if (success) {
        await fetchVehicles();
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
      setError(err instanceof Error ? err.message : 'Failed to configure telemetry');
      return { success: false, message: err instanceof Error ? err.message : undefined };
    }
  }, [fetchVehicles]);

  const deleteTelemetryForVehicle = useCallback(async (vin: string): Promise<boolean> => {
    try {
      const result = await deleteTelemetryConfigUseCase.execute(vin);
      if (result.success) {
        await fetchVehicles();
        return true;
      }
      setError(result.message);
      return false;
    } catch (err) {
      console.error('Failed to delete telemetry config:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete telemetry configuration');
      return false;
    }
  }, [fetchVehicles]);

  const toggleBreakInMonitoringForVehicle = useCallback(async (vin: string, enable: boolean): Promise<boolean> => {
    try {
      const result = await toggleBreakInMonitoringUseCase.execute(vin, enable);
      if (result.success) {
        await fetchVehicles();
        return true;
      }
      setError(result.message);
      return false;
    } catch (err) {
      console.error('Failed to toggle break-in monitoring:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle break-in monitoring');
      return false;
    }
  }, [fetchVehicles]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return {
    vehicles,
    isLoading,
    error,
    fetchVehicles,
    configureTelemetryForVehicle,
    deleteTelemetryForVehicle,
    toggleBreakInMonitoringForVehicle,
  };
}
