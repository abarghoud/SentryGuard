import { AlertEvent, AlertEventNotificationStatus, NotificationChannel } from '../../../entities/alert-event.entity';

export const alertNotificationRepositoryRequirementsSymbol = Symbol('AlertNotificationRepositoryRequirements');

export interface AlertNotificationState {
  attempts: number;
  deliveredChannels: NotificationChannel[];
  nextAttemptAt: Date | null;
  status: AlertEventNotificationStatus;
}

export interface AlertNotificationRepositoryRequirements {
  findDueForSweep(neverAttemptedCreatedBefore: Date, retryDueAt: Date, limit: number): Promise<AlertEvent[]>;
  findPendingState(alertEventId: string): Promise<AlertNotificationState | null>;
  leaseDueNotification(alertEventId: string, expectedAttempts: number, now: Date, leaseUntil: Date): Promise<boolean>;
  replacePendingState(alertEventId: string, expectedAttempts: number, nextState: AlertNotificationState): Promise<boolean>;
}
