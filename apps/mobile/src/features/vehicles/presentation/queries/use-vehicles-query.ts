import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { Vehicle } from '../../domain/entities';
import { GetVehiclesRequirements } from '../../domain/use-cases/vehicles.use-cases.requirements';

export interface VehiclesQueryDependencies {
  getVehiclesUseCase: GetVehiclesRequirements;
}

export const createUseVehiclesQuery =
  (deps: VehiclesQueryDependencies) =>
  (): UseQueryResult<Vehicle[], Error> =>
    useQuery<Vehicle[], Error>({
      queryFn: () => deps.getVehiclesUseCase.execute(),
      queryKey: ['vehicles'],
    });
