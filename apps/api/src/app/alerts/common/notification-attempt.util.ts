import { AlertEventNotificationStatus, NotificationChannel } from '../../../entities/alert-event.entity';
import { AlertNotificationState } from '../interfaces/alert-notification-repository.requirements';
import { NotificationRetryPolicy } from './notification-attempt.types';

const maxBackoffExponent = 30;

function computeRetryDelayMs(failedAttempts: number, policy: NotificationRetryPolicy): number {
  return Math.min(policy.baseDelayMs * 2 ** Math.min(failedAttempts - 1, maxBackoffExponent), policy.maxDelayMs);
}

function mergeDeliveredChannels(current: NotificationChannel[], added: NotificationChannel[]): NotificationChannel[] {
  return [...new Set([...current, ...added])].sort();
}

function resolveStatusAfterFailedAttempt(isLastAttempt: boolean, deliveredChannels: NotificationChannel[]): AlertEventNotificationStatus {
  if (!isLastAttempt) {
    return AlertEventNotificationStatus.Pending;
  }

  return deliveredChannels.length > 0 ? AlertEventNotificationStatus.Sent : AlertEventNotificationStatus.Failed;
}

export function toFailedAttemptState(
  current: AlertNotificationState,
  newlyDelivered: NotificationChannel[],
  policy: NotificationRetryPolicy,
  now: Date
): AlertNotificationState {
  const attempts = current.attempts + 1;
  const deliveredChannels = mergeDeliveredChannels(current.deliveredChannels, newlyDelivered);
  const isLastAttempt = attempts >= policy.maxAttempts;

  return {
    attempts,
    deliveredChannels,
    nextAttemptAt: isLastAttempt ? null : new Date(now.getTime() + computeRetryDelayMs(attempts, policy)),
    status: resolveStatusAfterFailedAttempt(isLastAttempt, deliveredChannels),
  };
}

export function toSentState(current: AlertNotificationState, newlyDelivered: NotificationChannel[]): AlertNotificationState {
  return {
    attempts: current.attempts,
    deliveredChannels: mergeDeliveredChannels(current.deliveredChannels, newlyDelivered),
    nextAttemptAt: null,
    status: AlertEventNotificationStatus.Sent,
  };
}

export function toUndeliverableState(current: AlertNotificationState): AlertNotificationState {
  return { ...current, nextAttemptAt: null, status: AlertEventNotificationStatus.Failed };
}
