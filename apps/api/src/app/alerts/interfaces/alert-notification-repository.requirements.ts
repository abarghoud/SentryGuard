import { AlertEvent, AlertEventNotificationStatus } from '../../../entities/alert-event.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';

export const alertNotificationRepositoryRequirementsSymbol = Symbol('AlertNotificationRepositoryRequirements');

export interface AlertNotificationState {
  attempts: number;
  deliveredChannels: NotificationChannel[];
  nextAttemptAt: Date | null;
  status: AlertEventNotificationStatus;
}

export interface AlertNotificationRepositoryRequirements {
  addDeliveredChannel(alertEventId: string, channel: NotificationChannel): Promise<void>;
  findDueForSweep(neverAttemptedCreatedBefore: Date, retryDueAt: Date, limit: number): Promise<AlertEvent[]>;
  findPendingState(alertEventId: string): Promise<AlertNotificationState | null>;
  leaseDueNotification(alertEventId: string, expectedAttempts: number, now: Date, leaseUntil: Date): Promise<boolean>;
  replacePendingState(alertEventId: string, expectedAttempts: number, nextState: AlertNotificationState): Promise<boolean>;
}
