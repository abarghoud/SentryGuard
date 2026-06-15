import { apiClient, tokenStore } from '../../core/api';
import { AlertApiRepository } from './data/alert.api-repository';
import { AlertMockRepository } from './data/alert.mock-repository';
import { AlertRepositoryRequirements } from './domain/alert.repository.requirements';
import { AlertEvent } from './domain/entities';
import { ClearAlertsUseCase, DeleteAlertUseCase, GetAlertsUseCase } from './domain/use-cases/alerts.use-cases';

class DynamicAlertRepository implements AlertRepositoryRequirements {
  public constructor(
    private readonly apiRepo: AlertRepositoryRequirements,
    private readonly mockRepo: AlertRepositoryRequirements
  ) {}

  private getRepo(): AlertRepositoryRequirements {
    return tokenStore.isDemo() ? this.mockRepo : this.apiRepo;
  }

  public async getAlerts(): Promise<AlertEvent[]> {
    return this.getRepo().getAlerts();
  }

  public async deleteAlert(alertId: string): Promise<{ success: boolean }> {
    return this.getRepo().deleteAlert(alertId);
  }

  public async clearAlerts(): Promise<{ success: boolean }> {
    return this.getRepo().clearAlerts();
  }
}

export const alertRepository = new DynamicAlertRepository(
  new AlertApiRepository(apiClient),
  new AlertMockRepository()
);

export const getAlertsUseCase = new GetAlertsUseCase(alertRepository);
export const clearAlertsUseCase = new ClearAlertsUseCase(alertRepository);
export const deleteAlertUseCase = new DeleteAlertUseCase(alertRepository);
