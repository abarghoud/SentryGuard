import { AlertEvent } from '../entities';
import { AlertRepositoryRequirements } from '../alert.repository.requirements';
import { ClearAlertsRequirements, DeleteAlertRequirements, GetAlertsRequirements } from './alerts.use-cases.requirements';

export class GetAlertsUseCase implements GetAlertsRequirements {
  public constructor(private readonly repository: AlertRepositoryRequirements) {}

  public async execute(): Promise<AlertEvent[]> {
    return this.repository.getAlerts();
  }
}

export class ClearAlertsUseCase implements ClearAlertsRequirements {
  public constructor(private readonly repository: AlertRepositoryRequirements) {}

  public async execute(): Promise<{ success: boolean }> {
    return this.repository.clearAlerts();
  }
}

export class DeleteAlertUseCase implements DeleteAlertRequirements {
  public constructor(private readonly repository: AlertRepositoryRequirements) {}

  public async execute(alertId: string): Promise<{ success: boolean }> {
    return this.repository.deleteAlert(alertId);
  }
}
