'use client';

import { useState, useEffect } from 'react';
import { getVehicles, configureTelemetry, type Vehicle } from './api';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  const configureTelemetryForVehicle = async (vin: string) => {
    try {
      await configureTelemetry(vin);
      // Rafraîchir la liste après configuration
      await fetchVehicles();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure telemetry');
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
  };
}

