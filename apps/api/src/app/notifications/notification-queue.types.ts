import { NotificationLane } from './notification-lane.enum';

export interface NotificationJobContext {
  label: string;
  vin: string;
  correlationId?: string;
  alertEventId?: string;
  lane?: NotificationLane;
}
