import { AlertEvent } from '../entities';

export interface GetAlertsRequirements {
  execute(): Promise<AlertEvent[]>;
}

export interface ClearAlertsRequirements {
  execute(): Promise<{ success: boolean }>;
}
