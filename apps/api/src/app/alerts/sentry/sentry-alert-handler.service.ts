import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramService } from '../../telegram/telegram.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryEventHandler, TelemetryMessage } from '../../telemetry/interfaces/telemetry-event-handler.interface';

@Injectable()
export class SentryAlertHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(SentryAlertHandlerService.name);

  constructor(
    private readonly telegramService: TelegramService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    const sentryData = telemetryMessage.data.find((item) => item.key === 'SentryMode');

    if (sentryData && sentryData.value.stringValue === 'Aware') {
      await this.sendSentryAlert(telemetryMessage);
    }
  }

  private async sendSentryAlert(message: TelemetryMessage): Promise<void> {
    try {
      this.logger.log('Sentry alert detected!');

      const vehicle = await this.vehicleRepository.findOne({
        where: { vin: message.vin },
        select: ['userId', 'display_name'],
      });

      if (!vehicle) {
        this.logger.warn(`No vehicle found for VIN: ${message.vin}`);
        return;
      }

      const alertInfo = {
        vin: message.vin,
        display_name: vehicle.display_name
      };

      await this.telegramService.sendSentryAlert(vehicle.userId, alertInfo);
      this.logger.log(`Sentry alert sent for VIN: ${message.vin}`);
    } catch (error) {
      this.logger.error('Error sending Sentry alert:', error);
      throw error;
    }
  }
}

