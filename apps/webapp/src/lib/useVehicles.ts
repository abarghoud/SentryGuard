'use client';

import { useState, useEffect } from 'react';
import {
  getVehicles,
  configureTelemetry,
  deleteTelemetryConfig,
  hasToken,
  type Vehicle,
} from './api';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    if (!hasToken()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  const configureTelemetryForVehicle = async (
    vin: string
  ): Promise<{
    success: boolean;
    message?: string;
    skippedVehicle?: { vin: string; reason: string; details?: string } | null;
  }> => {
    try {
      const response = await configureTelemetry(vin);
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
      setError(
        err instanceof Error ? err.message : 'Failed to configure telemetry'
      );
      return { success: false, message: err instanceof Error ? err.message : undefined };
    }
  };

  const deleteTelemetryForVehicle = async (vin: string): Promise<boolean> => {
    try {
      const result = await deleteTelemetryConfig(vin);
      if (result.success) {
        await fetchVehicles();
        return true;
      }
      setError(result.message);
      return false;
    } catch (err) {
      console.error('Failed to delete telemetry config:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete telemetry configuration'
      );
      return false;
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return {
    vehicles,
    isLoading,
    error,
    fetchVehicles,
    configureTelemetryForVehicle,
    deleteTelemetryForVehicle,
  };
}
