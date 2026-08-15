import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import {
  AlertEvent,
  AlertEventNotificationStatus,
  AlertEventSeverity,
  AlertEventType,
} from '../../entities/alert-event.entity';

const maxAlertEventsPerUser = 50;

export interface AlertEventDto {
  created_at: Date;
  id: string;
  severity: AlertEventSeverity;
  type: AlertEventType;
  vehicle_display_name?: string | null;
  vin: string;
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertEvent)
    private readonly alertEventRepository: Repository<AlertEvent>
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
    vehicleDisplayName?: string
  ): Promise<string> {
    const savedEvent = await this.alertEventRepository.save(
      this.alertEventRepository.create({ userId, vin, type, severity, vehicle_display_name: vehicleDisplayName })
    );
    await this.deleteOldAlertEvents(userId);

    return savedEvent.id;
  }

  public async markNotificationSent(alertEventId: string): Promise<void> {
    await this.alertEventRepository.update(
      { id: alertEventId, notification_status: AlertEventNotificationStatus.Pending },
      { notification_status: AlertEventNotificationStatus.Sent }
    );
  }

  public async markNotificationAttemptFailed(alertEventId: string, maxAttempts: number): Promise<void> {
    await this.alertEventRepository
      .createQueryBuilder()
      .update(AlertEvent)
      .set({ notification_attempts: () => 'notification_attempts + 1' })
      .where('id = :id AND notification_status = :pendingStatus', {
        id: alertEventId,
        pendingStatus: AlertEventNotificationStatus.Pending,
      })
      .execute();

    await this.alertEventRepository
      .createQueryBuilder()
      .update(AlertEvent)
      .set({ notification_status: AlertEventNotificationStatus.Failed })
      .where(
        'id = :id AND notification_status = :pendingStatus AND notification_attempts >= :maxAttempts',
        {
          id: alertEventId,
          pendingStatus: AlertEventNotificationStatus.Pending,
          maxAttempts,
        }
      )
      .execute();
  }

  public async findPendingNotificationsBefore(cutoff: Date): Promise<AlertEvent[]> {
    return this.alertEventRepository.find({
      where: {
        notification_status: AlertEventNotificationStatus.Pending,
        created_at: LessThan(cutoff),
      },
    });
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
      where: { userId },
    });
    return alerts.map((alert) => alert.id);
  }

  private toDto(event: AlertEvent): AlertEventDto {
    return {
      created_at: event.created_at,
      id: event.id,
      severity: event.severity,
      type: event.type,
      vehicle_display_name: event.vehicle_display_name,
      vin: event.vin,
    };
  }
}
