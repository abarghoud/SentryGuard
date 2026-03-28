import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { UserLanguageService } from '../../user/user-language.service';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';

export interface AlertDispatchConfig {
  telemetryMessage: TelemetryMessage;
  alertName: string;
  latencyLabel: string;
  telegramNotifier: (userId: string, alertInfo: { vin: string; display_name?: string }, userLanguage: 'en' | 'fr') => Promise<void>;
}

@Injectable()
export class VehicleAlertNotifierService {
  private readonly logger = new Logger(VehicleAlertNotifierService.name);
  private static readonly DB_SLOW_THRESHOLD_MS = 100;
  private static readonly TELEGRAM_SLOW_THRESHOLD_MS = 500;

  constructor(
    private readonly userLanguageService: UserLanguageService,
    private readonly kafkaLogContextService: KafkaLogContextService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) { }

  async dispatch(config: AlertDispatchConfig): Promise<void> {
    const handlerStartTime = Date.now();
    const { telemetryMessage: message, alertName, latencyLabel, telegramNotifier } = config;

    try {
      const vehicles = await this.findVehiclesByVin(message.vin, message.correlationId);

      if (vehicles.length === 0) {
        return;
      }

      const userIds = this.extractUniqueUserIds(vehicles);
      this.kafkaLogContextService.assignUserId(userIds.join(','));

      const alertInfo = this.buildAlertInfo(message.vin, vehicles[0].display_name);

      this.logMultiUserNotification(message.vin, userIds.length);

      const results = await this.notifyAllUsers(userIds, alertInfo, telegramNotifier, message.correlationId, alertName);
      this.logNotificationResults(results, message.vin, alertName, message.correlationId);

      this.logAlertLatency(message, handlerStartTime, latencyLabel);
    } catch (error) {
      this.logger.error(`Error in ${alertName}:`, error);
      throw error;
    }
  }

  private async findVehiclesByVin(vin: string, correlationId?: string): Promise<Vehicle[]> {
    const dbStart = Date.now();
    const vehicles = await this.vehicleRepository.find({
      where: { vin },
      select: ['userId', 'display_name'],
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

  private async notifyAllUsers(
    userIds: string[],
    alertInfo: { vin: string; display_name?: string },
    telegramNotifier: AlertDispatchConfig['telegramNotifier'],
    correlationId?: string,
    alertName?: string
  ): Promise<Array<{ success: boolean; userId: string; error?: unknown }>> {
    const notificationPromises = userIds.map(userId =>
      this.notifyUser(userId, alertInfo, telegramNotifier, correlationId, alertName)
    );

    return Promise.all(notificationPromises);
  }

  private async notifyUser(
    userId: string,
    alertInfo: { vin: string; display_name?: string },
    telegramNotifier: AlertDispatchConfig['telegramNotifier'],
    correlationId?: string,
    alertName?: string
  ): Promise<{ success: boolean; userId: string; error?: unknown }> {
    try {
      const userLanguage = await this.userLanguageService.getUserLanguage(userId);

      const telegramStart = Date.now();
      await telegramNotifier(userId, alertInfo, userLanguage);
      const telegramTime = Date.now() - telegramStart;

      if (telegramTime > VehicleAlertNotifierService.TELEGRAM_SLOW_THRESHOLD_MS) {
        this.logger.warn(`[TELEGRAM_SLOW][${correlationId}] ${alertName}: ${telegramTime}ms for user: ${userId}`);
      }

      return { success: true, userId };
    } catch (error) {
      this.logger.error(`[NOTIFICATION_ERROR] Failed to send ${alertName} to user ${userId} for VIN ${alertInfo.vin}:`, error);
      return { success: false, userId, error };
    }
  }

  private logNotificationResults(
    results: Array<{ success: boolean; userId: string }>,
    vin: string,
    alertName: string,
    correlationId?: string
  ): void {
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      this.logger.log(`[${alertName}] Successfully notified ${successCount} user(s) for VIN ${vin} (correlation: ${correlationId})`);
    }

    if (failureCount > 0) {
      this.logger.warn(`[${alertName}] Failed to notify ${failureCount} user(s) for VIN ${vin} (correlation: ${correlationId})`);
    }
  }

  private logAlertLatency(telemetryMessage: TelemetryMessage, handlerStartTime: number, latencyLabel: string): void {
    if (!telemetryMessage.correlationId) {
      return;
    }

    const endToEndLatency = telemetryMessage.calculateEndToEndLatency();
    const handlerProcessingTime = Date.now() - handlerStartTime;

    if (endToEndLatency !== null) {
      const isProcessingDelayed = telemetryMessage.isProcessingDelayed(handlerProcessingTime, 1000);

      if (isProcessingDelayed) {
        this.logger.error(`[${latencyLabel}] CorrelationId: ${telemetryMessage.correlationId} - DELAYED: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ❌`);
      } else {
        this.logger.log(`[${latencyLabel}] CorrelationId: ${telemetryMessage.correlationId} - Total: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ✅`);
      }
    }
  }
}
