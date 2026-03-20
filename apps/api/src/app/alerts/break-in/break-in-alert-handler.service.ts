import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { UserLanguageService } from '../../user/user-language.service';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';

@Injectable()
export class BreakInAlertHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(BreakInAlertHandlerService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly keyboardBuilder: TelegramKeyboardBuilderService,
    private readonly userLanguageService: UserLanguageService,
    private readonly kafkaLogContextService: KafkaLogContextService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) { }

  async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    if (!telemetryMessage.validateContainsCenterDisplay()) {
      return;
    }

    if (telemetryMessage.isCenterDisplayLocked()) {
      await this.sendBreakInAlert(telemetryMessage);
    }
  }

  private async sendBreakInAlert(message: TelemetryMessage): Promise<void> {
    try {
      const vehicles = await this.vehicleRepository.find({
        where: { vin: message.vin },
        select: ['userId', 'display_name', 'break_in_monitoring_enabled'],
      });

      if (vehicles.length === 0) {
        return;
      }

      const enabledVehicles = vehicles.filter(vehicle => vehicle.break_in_monitoring_enabled);
      if (enabledVehicles.length === 0) {
        return;
      }

      const userIds = [...new Set(enabledVehicles.map(vehicle => vehicle.userId))];
      this.kafkaLogContextService.assignUserId(userIds.join(','));

      const alertInfo = { vin: message.vin, display_name: enabledVehicles[0].display_name };

      const notificationPromises = userIds.map(async userId => {
        try {
          const userLanguage = await this.userLanguageService.getUserLanguage(userId);
          const keyboard = this.keyboardBuilder.buildBreakInAlertKeyboard(userId, userLanguage);

          await this.telegramService.sendBreakInAlert(userId, alertInfo, userLanguage, keyboard);
        } catch (error) {
          this.logger.error(`[NOTIFICATION_ERROR] Failed to send BreakIn alert to user ${userId}:`, error);
        }
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      this.logger.error(`Error in BreakInAlert:`, error);
      throw error;
    }
  }
}
