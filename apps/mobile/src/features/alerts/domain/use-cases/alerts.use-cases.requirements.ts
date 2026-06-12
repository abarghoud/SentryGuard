import { AlertEvent } from '../entities';

export interface GetAlertsRequirements {
  execute(): Promise<AlertEvent[]>;
}

export interface ClearAlertsRequirements {
  execute(): Promise<{ success: boolean }>;
}

export interface DeleteAlertRequirements {
  execute(alertId: string): Promise<{ success: boolean }>;
}
