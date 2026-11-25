import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { AlertEventType } from '../../../entities/alert-event.entity';
import { AlertsService } from '../alerts.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationLane } from '../../notifications/notification-lane.enum';
import { NotificationQueueService } from '../../notifications/notification-queue.service';
import { AlertNotifierPayload } from './alert-notifier.registry';
import { AlertDispatchConfig } from './alert-delivery.types';
import { UserAlertNotificationService } from './user-alert-notification.service';
import { CaughtError } from '../../../common/utils/caught-error';

interface RecordedAlert {
  alertEventId: string;
  detectedAt: Date;
  isMuted: boolean;
  userId: string;
}

@Injectable()
export class VehicleAlertNotifierService {
  private readonly logger = new Logger(VehicleAlertNotifierService.name);
  private static readonly DB_SLOW_THRESHOLD_MS = 100;

  constructor(
    private readonly kafkaLogContextService: KafkaLogContextService,
    private readonly alertsService: AlertsService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly userAlertNotificationService: UserAlertNotificationService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  async dispatch(config: AlertDispatchConfig): Promise<{ userIds: string[] }> {
    const handlerStartTime = Date.now();
    const { telemetryMessage: message, alertName, latencyLabel } = config;

    try {
      const vehicles = await this.findVehiclesByVin(message.vin, message.correlationId);

      if (vehicles.length === 0) {
        return { userIds: [] };
      }

      const userIds = this.extractUniqueUserIds(vehicles);
      this.kafkaLogContextService.assignUserId(userIds.join(','));

      const alertInfo = this.buildAlertInfo(message.vin, vehicles[0].display_name);

      this.logMultiUserNotification(message.vin, userIds.length);

      const recordedAlerts = await this.recordAlerts(userIds, alertInfo, config);
      this.enqueueUserNotifications(recordedAlerts, alertInfo, message.correlationId, alertName, config);

      this.logAlertLatency(message, handlerStartTime, latencyLabel, config.reactionDelayMs ?? 0);

      return { userIds };
    } catch (error) {
      this.logger.error(`Error in ${alertName}: ${new CaughtError(error).describe()}`);
      throw error;
    }
  }

  public enqueueNotification(payload: AlertNotifierPayload, lane = NotificationLane.Immediate): boolean {
    return this.notificationQueueService.enqueue(
      () => this.kafkaLogContextService.runWithContext(
        {
          vin: payload.vin,
          correlationId: payload.correlationId ?? `notification-${payload.vin}`,
        },
        () => this.notify(payload, lane)
      ),
      {
        label: `${payload.type}:${payload.userId}`,
        vin: payload.vin,
        correlationId: payload.correlationId,
        alertEventId: payload.alertEventId,
        lane,
      }
    );
  }

  private notify(payload: AlertNotifierPayload, lane: NotificationLane): Promise<void> {
    return lane === NotificationLane.Retry
      ? this.userAlertNotificationService.notify(payload)
      : this.userAlertNotificationService.notifyFreshAlert(payload);
  }

  private async findVehiclesByVin(vin: string, correlationId?: string): Promise<Vehicle[]> {
    const dbStart = Date.now();
    const vehicles = await this.vehicleRepository.find({
      where: { vin },
      select: {
        userId: true,
        display_name: true
      },
    });
    const dbTime = Date.now() - dbStart;

    this.logger.log(`[DB_TIME][VEHICLE_LOOKUP] Vehicle lookup: ${dbTime}ms for VIN: ${vin} (correlation: ${correlationId})`);

    if (dbTime > VehicleAlertNotifierService.DB_SLOW_THRESHOLD_MS) {
      this.logger.warn(`[DB_SLOW][${correlationId}] Vehicle lookup: ${dbTime}ms for VIN: ${vin}`);
    }

    if (vehicles.length === 0) {
      this.logger.warn(`No vehicle found for VIN: ${vin}`);
    }

    return vehicles;
  }

  private extractUniqueUserIds(vehicles: Vehicle[]): string[] {
    return [...new Set(vehicles.map(vehicle => vehicle.userId))];
  }

  private buildAlertInfo(vin: string, displayName?: string): { vin: string; display_name?: string } {
    return { vin, display_name: displayName };
  }

  private logMultiUserNotification(vin: string, userCount: number): void {
    if (userCount > 1) {
      this.logger.log(`[MULTI_USER_VEHICLE] VIN ${vin} is associated with ${userCount} users, notifying all of them`);
    }
  }

  private async recordAlerts(
    userIds: string[],
    alertInfo: { vin: string; display_name?: string },
    config: AlertDispatchConfig
  ): Promise<RecordedAlert[]> {
    const detectedAt = new Date();

    return Promise.all(
      userIds.map(async (userId) => {
        const isMuted = await this.resolveIsMuted(userId, config.type);
        const alertEventId = await this.alertsService.record(
          userId,
          alertInfo.vin,
          config.type,
          config.severity,
          alertInfo.display_name,
          isMuted
        );
        return { alertEventId, detectedAt, isMuted, userId };
      })
    );
  }

  private async resolveIsMuted(userId: string, type: AlertEventType): Promise<boolean> {
    return type === AlertEventType.Sentry && (await this.notificationsService.isMuted(userId));
  }

  private enqueueUserNotifications(
    recordedAlerts: RecordedAlert[],
    alertInfo: { vin: string; display_name?: string },
    correlationId: string | undefined,
    alertName: string,
    config: AlertDispatchConfig
  ): void {
    for (const { userId, alertEventId, detectedAt, isMuted } of recordedAlerts) {
      this.enqueueNotification({
        alertEventId,
        correlationId,
        detectedAt,
        muted: isMuted,
        severity: config.severity,
        type: config.type,
        userId,
        vehicleDisplayName: alertInfo.display_name,
        vin: alertInfo.vin,
      });
    }

    this.logger.log(`[${alertName}] Enqueued ${recordedAlerts.length} notification job(s)`);
  }

  private logAlertLatency(
    telemetryMessage: TelemetryMessage,
    handlerStartTime: number,
    latencyLabel: string,
    reactionDelayMs: number
  ): void {
    if (!telemetryMessage.correlationId) {
      return;
    }

    const measuredLatency = telemetryMessage.calculateEndToEndLatency();
    const endToEndLatency = measuredLatency === null ? null : measuredLatency - reactionDelayMs;
    const handlerProcessingTime = Date.now() - handlerStartTime;

    if (endToEndLatency !== null) {
      const isProcessingDelayed = telemetryMessage.isProcessingDelayed(handlerProcessingTime, 3000);

      if (isProcessingDelayed) {
        this.logger.error(`[${latencyLabel}] CorrelationId: ${telemetryMessage.correlationId} - DELAYED: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ❌`);
      } else {
        this.logger.log(`[${latencyLabel}] CorrelationId: ${telemetryMessage.correlationId} - Total: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ✅`);
      }
    }
  }
}
