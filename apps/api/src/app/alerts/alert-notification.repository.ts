import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, IsNull, LessThan, LessThanOrEqual, Or, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { AlertEvent, AlertEventNotificationStatus } from '../../entities/alert-event.entity';
import { NotificationChannel } from './enums/notification-channel.enum';
import {
  AlertNotificationRepositoryRequirements,
  AlertNotificationState,
} from './interfaces/alert-notification-repository.requirements';

const notificationStateColumns: FindOptionsSelect<AlertEvent> = {
  id: true,
  notification_attempts: true,
  notification_delivered_channels: true,
  notification_next_attempt_at: true,
  notification_status: true,
};

@Injectable()
export class AlertNotificationRepository implements AlertNotificationRepositoryRequirements {
  constructor(
    @InjectRepository(AlertEvent)
    private readonly alertEventRepository: Repository<AlertEvent>
  ) {}

  public async addDeliveredChannel(alertEventId: string, channel: NotificationChannel): Promise<void> {
    await this.alertEventRepository
      .createQueryBuilder()
      .update(AlertEvent)
      .set({ notification_delivered_channels: () => 'array_append(array_remove("notification_delivered_channels", :channel), :channel)' })
      .where('id = :alertEventId AND notification_status = :status', { alertEventId, status: AlertEventNotificationStatus.Pending })
      .setParameter('channel', channel)
      .execute();
  }

  public async findDueForSweep(neverAttemptedCreatedBefore: Date, retryDueAt: Date, limit: number): Promise<AlertEvent[]> {
    return this.alertEventRepository.find({
      order: { created_at: 'ASC' },
      take: limit,
      where: [
        { created_at: LessThan(neverAttemptedCreatedBefore), notification_next_attempt_at: IsNull(), notification_status: AlertEventNotificationStatus.Pending },
        { notification_next_attempt_at: LessThanOrEqual(retryDueAt), notification_status: AlertEventNotificationStatus.Pending },
      ],
    });
  }

  public async findPendingState(alertEventId: string): Promise<AlertNotificationState | null> {
    const event = await this.alertEventRepository.findOne({
      select: notificationStateColumns,
      where: { id: alertEventId, notification_status: AlertEventNotificationStatus.Pending },
    });

    return event ? this.toState(event) : null;
  }

  public async leaseDueNotification(alertEventId: string, expectedAttempts: number, now: Date, leaseUntil: Date): Promise<boolean> {
    const result = await this.alertEventRepository.update(
      {
        id: alertEventId,
        notification_attempts: expectedAttempts,
        notification_next_attempt_at: Or(IsNull(), LessThanOrEqual(now)),
        notification_status: AlertEventNotificationStatus.Pending,
      },
      { notification_next_attempt_at: leaseUntil }
    );

    return (result.affected ?? 0) > 0;
  }

  public async replacePendingState(alertEventId: string, expectedAttempts: number, nextState: AlertNotificationState): Promise<boolean> {
    const result = await this.alertEventRepository.update(
      { id: alertEventId, notification_attempts: expectedAttempts, notification_status: AlertEventNotificationStatus.Pending },
      this.toColumns(nextState)
    );

    return (result.affected ?? 0) > 0;
  }

  private toColumns(state: AlertNotificationState): QueryDeepPartialEntity<AlertEvent> {
    return {
      notification_attempts: state.attempts,
      notification_delivered_channels: state.deliveredChannels,
      notification_next_attempt_at: state.nextAttemptAt,
      notification_status: state.status,
    };
  }

  private toState(event: AlertEvent): AlertNotificationState {
    return {
      attempts: event.notification_attempts,
      deliveredChannels: event.notification_delivered_channels,
      nextAttemptAt: event.notification_next_attempt_at ?? null,
      status: event.notification_status ?? AlertEventNotificationStatus.Pending,
    };
  }
}
