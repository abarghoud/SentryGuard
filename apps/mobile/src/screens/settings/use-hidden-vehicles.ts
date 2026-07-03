import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { setVehicleHiddenUseCase, useHiddenVehiclesQuery, useVehiclesQuery } from '../../features/vehicles/di';
import { Vehicle, VehicleActionResponse } from '../../features/vehicles/domain/entities';

interface HiddenVehicles {
  hiddenVehicles: Vehicle[];
  isLoading: boolean;
  restoreMutation: UseMutationResult<VehicleActionResponse, Error, string>;
}

export function useHiddenVehicles(): HiddenVehicles {
  const queryClient = useQueryClient();
  const vehiclesQuery = useVehiclesQuery();
  const hiddenVehiclesQuery = useHiddenVehiclesQuery();

  const hiddenVehicles = useMemo(() => {
    const hiddenVins = new Set(hiddenVehiclesQuery.data ?? []);
    return (vehiclesQuery.data ?? []).filter((vehicle) => hiddenVins.has(vehicle.vin));
  }, [hiddenVehiclesQuery.data, vehiclesQuery.data]);

  const restoreMutation = useMutation<VehicleActionResponse, Error, string>({
    mutationFn: (vin: string) => setVehicleHiddenUseCase.execute(vin, false),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hidden-vehicles'] });
    },
  });

  return {
    hiddenVehicles,
    isLoading: vehiclesQuery.isLoading || hiddenVehiclesQuery.isLoading,
    restoreMutation,
  };
}
