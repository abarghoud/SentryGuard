import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { UserLanguageService } from '../../user/user-language.service';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';
import { AlertsService } from '../alerts.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationQueueService } from '../../notifications/notification-queue.service';
import { AlertNotifierPayload, AlertNotifierRegistry } from './alert-notifier.registry';
import { NOTIFICATION_SWEEP_MAX_ATTEMPTS } from '../../../config/notification-sweep-cron.config';

export interface AlertDispatchConfig {
  telemetryMessage: TelemetryMessage;
  alertName: string;
  latencyLabel: string;
  severity: AlertEventSeverity;
  type: AlertEventType;
}

interface RecordedAlert {
  userId: string;
  alertEventId: string;
}

@Injectable()
export class VehicleAlertNotifierService {
  private readonly logger = new Logger(VehicleAlertNotifierService.name);
  private static readonly DB_SLOW_THRESHOLD_MS = 100;
  private static readonly TELEGRAM_SLOW_THRESHOLD_MS = 500;

  constructor(
    private readonly userLanguageService: UserLanguageService,
    private readonly kafkaLogContextService: KafkaLogContextService,
    private readonly alertsService: AlertsService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly alertNotifierRegistry: AlertNotifierRegistry,
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

      this.logAlertLatency(message, handlerStartTime, latencyLabel);

      return { userIds };
    } catch (error) {
      this.logger.error(`Error in ${alertName}:`, error);
      throw error;
    }
  }

  public enqueueNotification(payload: AlertNotifierPayload): boolean {
    return this.notificationQueueService.enqueue(
      () => this.kafkaLogContextService.runWithContext(
        {
          vin: payload.vin,
          correlationId: payload.correlationId ?? `notification-${payload.vin}`,
        },
        () => this.notifyUser(payload)
      ),
      {
        label: `${payload.type}:${payload.userId}`,
        vin: payload.vin,
        correlationId: payload.correlationId,
        alertEventId: payload.alertEventId,
      }
    );
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
    return [...new Set(vehicles.map(v => v.userId))];
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
    return Promise.all(userIds.map(async (userId) => {
      const alertEventId = await this.alertsService.record(
        userId,
        alertInfo.vin,
        config.type,
        config.severity,
        alertInfo.display_name
      );

      return { userId, alertEventId };
    }));
  }

  private enqueueUserNotifications(
    recordedAlerts: RecordedAlert[],
    alertInfo: { vin: string; display_name?: string },
    correlationId: string | undefined,
    alertName: string,
    config: AlertDispatchConfig
  ): void {
    for (const { userId, alertEventId } of recordedAlerts) {
      this.enqueueNotification({
        alertEventId,
        userId,
        vin: alertInfo.vin,
        vehicleDisplayName: alertInfo.display_name,
        type: config.type,
        severity: config.severity,
        correlationId,
      });
    }

    this.logger.log(`[${alertName}] Enqueued ${recordedAlerts.length} notification job(s)`);
  }

  private async notifyUser(payload: AlertNotifierPayload): Promise<void> {
    try {
      const userLanguage = await this.userLanguageService.getUserLanguage(payload.userId);

      const pushTask = this.notificationsService.sendPushAlert(
        payload.userId,
        payload.severity,
        payload.type,
        userLanguage,
        payload.correlationId
      );

      const telegramTask = (async () => {
        const telegramStart = Date.now();

        if (await this.notificationsService.shouldSendTelegram(payload.userId, payload.severity)) {
          await this.alertNotifierRegistry.notify(payload, userLanguage);
        }

        const telegramTime = Date.now() - telegramStart;

        if (telegramTime > VehicleAlertNotifierService.TELEGRAM_SLOW_THRESHOLD_MS) {
          this.logger.warn(`[TELEGRAM_SLOW][${payload.correlationId}] ${payload.type}: ${telegramTime}ms for user: ${payload.userId}`);
        }
      })();

      await Promise.all([pushTask, telegramTask]);

      await this.alertsService.markNotificationSent(payload.alertEventId);

      this.logger.log(`[${payload.type}] Notified user ${payload.userId} for VIN ${payload.vin} (correlation: ${payload.correlationId})`);
    } catch (error) {
      this.logger.error(`[NOTIFICATION_ERROR] Failed to send ${payload.type} to user ${payload.userId} for VIN ${payload.vin}:`, error);

      try {
        const isPermanentlyFailed = await this.alertsService.markNotificationAttemptFailed(
          payload.alertEventId,
          NOTIFICATION_SWEEP_MAX_ATTEMPTS
        );

        if (isPermanentlyFailed) {
          this.logger.error(
            `[NOTIFICATION_FAILED] Alert ${payload.alertEventId} permanently failed after ${NOTIFICATION_SWEEP_MAX_ATTEMPTS} attempts`
          );
        }
      } catch (markingError) {
        this.logger.error(`[NOTIFICATION_ERROR] Failed to mark notification attempt for alert ${payload.alertEventId}:`, markingError);
      }

      throw error;
    }
  }

  private logAlertLatency(telemetryMessage: TelemetryMessage, handlerStartTime: number, latencyLabel: string): void {
    if (!telemetryMessage.correlationId) {
      return;
    }

    const endToEndLatency = telemetryMessage.calculateEndToEndLatency();
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
