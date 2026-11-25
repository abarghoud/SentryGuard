export enum NotificationAttemptOutcome {
  NotPending = 'not_pending',
  RetryScheduled = 'retry_scheduled',
  PermanentlyFailed = 'permanently_failed',
  GaveUpPartiallyDelivered = 'gave_up_partially_delivered',
}
