import { AlertEvent } from './entities';

export interface AlertRepositoryRequirements {
  clearAlerts(): Promise<{ success: boolean }>;
  getAlerts(): Promise<AlertEvent[]>;
}
