import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { UserLanguageService } from '../../user/user-language.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { SentryModeState, TelemetryMessage } from '../../telemetry/models/telemetry-message.model';

@Injectable()
export class SentryAlertHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(SentryAlertHandlerService.name);
  private static readonly DB_SLOW_THRESHOLD_MS = 100;
  private static readonly TELEGRAM_SLOW_THRESHOLD_MS = 500;

  constructor(
    private readonly telegramService: TelegramService,
    private readonly keyboardBuilder: TelegramKeyboardBuilderService,
    private readonly userLanguageService: UserLanguageService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    if (!telemetryMessage.validateContainsSentryMode() || !telemetryMessage.validateSentryModeValue()) {
      this.logger.warn('Telemetry message does not contain SentryMode data', telemetryMessage);
      return;
    }

    const sentryMode = telemetryMessage.getSentryModeState();

    if (sentryMode === SentryModeState.Aware) {
      await this.sendSentryAlert(telemetryMessage);
    }
  }

  private async sendSentryAlert(message: TelemetryMessage): Promise<void> {
    const handlerStartTime = Date.now();

    try {
      const vehicles = await this.findVehiclesByVin(message.vin, message.correlationId);
      
      if (vehicles.length === 0) {
        this.logger.warn(`No vehicle found for VIN: ${message.vin}`);
        
        return;
      }

      const userIds = this.extractUniqueUserIds(vehicles);
      const alertInfo = this.buildAlertInfo(message.vin, vehicles[0].display_name);

      this.logMultiUserNotification(message.vin, userIds.length);

      const results = await this.notifyAllUsers(userIds, alertInfo, message.correlationId);
      this.logNotificationResults(results, message.vin, message.correlationId);

      this.logSentryAlertLatency(message, handlerStartTime);
    } catch (error) {
      this.logger.error(`Error in SentryAlert:`, error);
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

    if (dbTime > SentryAlertHandlerService.DB_SLOW_THRESHOLD_MS) {
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
    correlationId?: string
  ): Promise<Array<{ success: boolean; userId: string; error?: unknown }>> {
    const notificationPromises = userIds.map(userId =>
      this.notifyUser(userId, alertInfo, correlationId)
    );

    return Promise.all(notificationPromises);
  }

  private async notifyUser(
    userId: string,
    alertInfo: { vin: string; display_name?: string },
    correlationId?: string
  ): Promise<{ success: boolean; userId: string; error?: unknown }> {
    try {
      const userLanguage = await this.userLanguageService.getUserLanguage(userId);
      const keyboard = this.keyboardBuilder.buildSentryAlertKeyboard(alertInfo, userId, userLanguage);

      const telegramStart = Date.now();
      await this.telegramService.sendSentryAlert(userId, alertInfo, userLanguage, keyboard);
      const telegramTime = Date.now() - telegramStart;

      if (telegramTime > SentryAlertHandlerService.TELEGRAM_SLOW_THRESHOLD_MS) {
        this.logger.warn(`[TELEGRAM_SLOW][${correlationId}] Sentry alert: ${telegramTime}ms for user: ${userId}`);
      }

      return { success: true, userId };
    } catch (error) {
      this.logger.error(`[NOTIFICATION_ERROR] Failed to send Sentry alert to user ${userId} for VIN ${alertInfo.vin}:`, error);
      return { success: false, userId, error };
    }
  }

  private logNotificationResults(
    results: Array<{ success: boolean; userId: string }>,
    vin: string,
    correlationId?: string
  ): void {
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      this.logger.log(`[SENTRY_ALERT] Successfully notified ${successCount} user(s) for VIN ${vin} (correlation: ${correlationId})`);
    }

    if (failureCount > 0) {
      this.logger.warn(`[SENTRY_ALERT] Failed to notify ${failureCount} user(s) for VIN ${vin} (correlation: ${correlationId})`);
    }
  }

  private logSentryAlertLatency(telemetryMessage: TelemetryMessage, handlerStartTime: number): void {
    if (!telemetryMessage.correlationId) {
      return;
    }

    const endToEndLatency = telemetryMessage.calculateEndToEndLatency();
    const handlerProcessingTime = Date.now() - handlerStartTime;

    if (endToEndLatency !== null) {
      const isProcessingDelayed = telemetryMessage.isProcessingDelayed(handlerProcessingTime, 1000);

      if (isProcessingDelayed) {
        this.logger.error(`[SENTRY_LATENCY] CorrelationId: ${telemetryMessage.correlationId} - DELAYED: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ❌`);
      } else {
        this.logger.log(`[SENTRY_LATENCY] CorrelationId: ${telemetryMessage.correlationId} - Total: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ✅`);
      }
    }
  }
}

