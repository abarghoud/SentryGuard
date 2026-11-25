import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationAttemptOutcome } from '../enums/notification-attempt-outcome.enum';

export interface NotificationAttemptResult {
  attempts: number;
  deliveredChannels: NotificationChannel[];
  nextAttemptAt: Date | null;
  outcome: NotificationAttemptOutcome;
}

export interface NotificationRetryPolicy {
  baseDelayMs: number;
  maxAttempts: number;
  maxDelayMs: number;
}
