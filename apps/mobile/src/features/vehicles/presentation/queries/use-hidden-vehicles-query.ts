import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { GetHiddenVehicleVinsRequirements } from '../../domain/use-cases/vehicles.use-cases.requirements';

export interface HiddenVehiclesQueryDependencies {
  getHiddenVehicleVinsUseCase: GetHiddenVehicleVinsRequirements;
}

export const createUseHiddenVehiclesQuery =
  (deps: HiddenVehiclesQueryDependencies) =>
  (): UseQueryResult<string[], Error> =>
    useQuery<string[], Error>({
      queryFn: () => deps.getHiddenVehicleVinsUseCase.execute(),
      queryKey: ['hidden-vehicles'],
    });
