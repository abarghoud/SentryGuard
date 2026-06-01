import { apiClient } from '../../core/api';
import { AlertApiRepository } from './data/alert.api-repository';
import { ClearAlertsUseCase, GetAlertsUseCase } from './domain/use-cases/alerts.use-cases';

export const alertRepository = new AlertApiRepository(apiClient);

export const getAlertsUseCase = new GetAlertsUseCase(alertRepository);
export const clearAlertsUseCase = new ClearAlertsUseCase(alertRepository);
