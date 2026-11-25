import { Inject, Injectable } from '@nestjs/common';

import { AlertEvent, AlertEventNotificationStatus } from '../../entities/alert-event.entity';
import { NotificationChannel } from './enums/notification-channel.enum';
import type {
  AlertNotificationRepositoryRequirements,
  AlertNotificationState,
} from './interfaces/alert-notification-repository.requirements';
import { alertNotificationRepositoryRequirementsSymbol } from './interfaces/alert-notification-repository.requirements';
import { NotificationAttemptOutcome } from './enums/notification-attempt-outcome.enum';
import { NotificationAttemptResult, NotificationRetryPolicy } from './common/notification-attempt.types';
import { toFailedAttemptState, toSentState, toUndeliverableState } from './common/notification-attempt.util';

const maxConcurrentTransitionTries = 5;

type NotificationTransition = (current: AlertNotificationState) => AlertNotificationState;

@Injectable()
export class AlertNotificationStateService {
  constructor(
    @Inject(alertNotificationRepositoryRequirementsSymbol)
    private readonly alertNotificationRepository: AlertNotificationRepositoryRequirements
  ) {}

  public async markNotificationSent(alertEventId: string, deliveredChannels: NotificationChannel[] = []): Promise<void> {
    await this.transitionPendingNotification(alertEventId, (current) => toSentState(current, deliveredChannels));
  }

  public async markNotificationUndeliverable(alertEventId: string): Promise<void> {
    await this.transitionPendingNotification(alertEventId, toUndeliverableState);
  }

  public async recordNotificationAttemptFailure(
    alertEventId: string,
    deliveredChannels: NotificationChannel[],
    policy: NotificationRetryPolicy
  ): Promise<NotificationAttemptResult> {
    const transition: NotificationTransition = (current) => toFailedAttemptState(current, deliveredChannels, policy, new Date());
    return this.toAttemptResult(await this.transitionPendingNotification(alertEventId, transition));
  }

  public async findNotificationsDueForSweep(neverAttemptedCreatedBefore: Date, limit: number, now = new Date()): Promise<AlertEvent[]> {
    return this.alertNotificationRepository.findDueForSweep(neverAttemptedCreatedBefore, now, limit);
  }

  public async leaseNotification(alertEventId: string, expectedAttempts: number, leaseMs: number): Promise<{ isLeased: boolean }> {
    const now = new Date();
    const isLeased = await this.alertNotificationRepository.leaseDueNotification(
      alertEventId,
      expectedAttempts,
      now,
      new Date(now.getTime() + leaseMs)
    );

    return { isLeased };
  }

  private async transitionPendingNotification(
    alertEventId: string,
    transition: NotificationTransition,
    remainingTries = maxConcurrentTransitionTries
  ): Promise<AlertNotificationState | null> {
    const current = await this.alertNotificationRepository.findPendingState(alertEventId);
    if (!current) {
      return null;
    }

    const nextState = transition(current);
    const isReplaced = await this.alertNotificationRepository.replacePendingState(alertEventId, current.attempts, nextState);
    return isReplaced ? nextState : this.retryConcurrentTransition(alertEventId, transition, remainingTries);
  }

  private async retryConcurrentTransition(
    alertEventId: string,
    transition: NotificationTransition,
    remainingTries: number
  ): Promise<AlertNotificationState | null> {
    if (remainingTries <= 1) {
      throw new Error(`Notification state of alert ${alertEventId} kept changing concurrently`);
    }

    return this.transitionPendingNotification(alertEventId, transition, remainingTries - 1);
  }

  private toAttemptResult(state: AlertNotificationState | null): NotificationAttemptResult {
    if (!state) {
      return { attempts: 0, deliveredChannels: [], nextAttemptAt: null, outcome: NotificationAttemptOutcome.NotPending };
    }

    return {
      attempts: state.attempts,
      deliveredChannels: state.deliveredChannels,
      nextAttemptAt: state.nextAttemptAt,
      outcome: this.toAttemptOutcome(state.status),
    };
  }

  private toAttemptOutcome(status: AlertEventNotificationStatus): NotificationAttemptOutcome {
    switch (status) {
      case AlertEventNotificationStatus.Pending:
        return NotificationAttemptOutcome.RetryScheduled;
      case AlertEventNotificationStatus.Sent:
        return NotificationAttemptOutcome.GaveUpPartiallyDelivered;
      case AlertEventNotificationStatus.Failed:
        return NotificationAttemptOutcome.PermanentlyFailed;
    }
  }
}
