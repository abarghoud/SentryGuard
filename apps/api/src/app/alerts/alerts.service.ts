import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Or, Repository } from 'typeorm';

import {
  AlertEvent,
  AlertEventNotificationStatus,
  AlertEventSeverity,
  AlertEventType,
  NotificationChannel,
} from '../../entities/alert-event.entity';
import type {
  AlertNotificationRepositoryRequirements,
  AlertNotificationState,
} from './interfaces/alert-notification-repository.requirements';
import { alertNotificationRepositoryRequirementsSymbol } from './interfaces/alert-notification-repository.requirements';
import {
  NotificationRetryPolicy,
  toFailedAttemptState,
  toSentState,
  toUndeliverableState,
} from './common/notification-attempt.util';

const maxAlertEventsPerUser = 50;
const maxConcurrentTransitionTries = 5;

type NotificationTransition = (current: AlertNotificationState) => AlertNotificationState;

export enum NotificationAttemptOutcome {
  NotPending = 'not_pending',
  RetryScheduled = 'retry_scheduled',
  PermanentlyFailed = 'permanently_failed',
  GaveUpPartiallyDelivered = 'gave_up_partially_delivered',
}

export interface NotificationAttemptResult {
  attempts: number;
  deliveredChannels: NotificationChannel[];
  nextAttemptAt: Date | null;
  outcome: NotificationAttemptOutcome;
}

export interface AlertEventDto {
  created_at: Date;
  id: string;
  muted: boolean;
  severity: AlertEventSeverity;
  type: AlertEventType;
  vehicle_display_name?: string | null;
  vin: string;
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertEvent)
    private readonly alertEventRepository: Repository<AlertEvent>,
    @Inject(alertNotificationRepositoryRequirementsSymbol)
    private readonly alertNotificationRepository: AlertNotificationRepositoryRequirements
  ) {}

  public async listForUser(userId: string): Promise<AlertEventDto[]> {
    const events = await this.alertEventRepository.find({
      order: { created_at: 'DESC' },
      take: maxAlertEventsPerUser,
      where: { userId },
    });
    return events.map((event) => this.toDto(event));
  }

  public async clearForUser(userId: string): Promise<void> {
    await this.alertEventRepository.delete({ userId });
  }

  public async deleteForUser(userId: string, alertId: string): Promise<void> {
    await this.alertEventRepository.delete({ id: alertId, userId });
  }

  public async record(
    userId: string,
    vin: string,
    type: AlertEventType,
    severity: AlertEventSeverity,
    vehicleDisplayName?: string,
    muted = false
  ): Promise<string> {
    const savedEvent = await this.alertEventRepository.save(
      this.alertEventRepository.create({
        muted,
        notification_status: AlertEventNotificationStatus.Pending,
        userId,
        vin,
        type,
        severity,
        vehicle_display_name: vehicleDisplayName,
      })
    );
    await this.deleteOldAlertEvents(userId);

    return savedEvent.id;
  }

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

  public async leaseNotificationForRetry(alertEventId: string, expectedAttempts: number, leaseMs: number): Promise<{ isLeased: boolean }> {
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

  private async deleteOldAlertEvents(userId: string): Promise<void> {
    const oldAlertIds = await this.findOldAlertEventIds(userId);
    if (oldAlertIds.length === 0) {
      return;
    }

    await this.alertEventRepository.delete(oldAlertIds);
  }

  private async findOldAlertEventIds(userId: string): Promise<string[]> {
    const alerts = await this.alertEventRepository.find({
      order: { created_at: 'DESC' },
      select: { id: true },
      skip: maxAlertEventsPerUser,
      where: {
        notification_status: Or(IsNull(), Not(AlertEventNotificationStatus.Pending)),
        userId,
      },
    });
    return alerts.map((alert) => alert.id);
  }

  private toDto(event: AlertEvent): AlertEventDto {
    return {
      created_at: event.created_at,
      id: event.id,
      muted: event.muted ?? false,
      severity: event.severity,
      type: event.type,
      vehicle_display_name: event.vehicle_display_name,
      vin: event.vin,
    };
  }
}
