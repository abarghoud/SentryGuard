import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { AlertEvent } from '../../domain/entities';
import { GetAlertsRequirements } from '../../domain/use-cases/alerts.use-cases.requirements';

export interface AlertsQueryDependencies {
  getAlertsUseCase: GetAlertsRequirements;
}

const ALERTS_REFETCH_INTERVAL_MILLISECONDS = 30000;

export const createUseAlertsQuery =
  (deps: AlertsQueryDependencies) =>
  (): UseQueryResult<AlertEvent[], Error> =>
    useQuery<AlertEvent[], Error>({
      queryFn: () => deps.getAlertsUseCase.execute(),
      queryKey: ['alerts'],
      refetchInterval: ALERTS_REFETCH_INTERVAL_MILLISECONDS,
    });
