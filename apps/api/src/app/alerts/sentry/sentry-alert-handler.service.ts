import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramService } from '../../telegram/telegram.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { SentryModeState, TelemetryMessage } from '../../telemetry/models/telemetry-message.model';

@Injectable()
export class SentryAlertHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(SentryAlertHandlerService.name);

  constructor(
    private readonly telegramService: TelegramService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    if (!telemetryMessage.validateContainsSentryMode() || !telemetryMessage.validateSentryModeValue()) {
      this.logger.warn('Telemetry message does not contain SentryMode data', telemetryMessage);
      return;
    }

    const sentryData = telemetryMessage.data.find(item => item.key === 'SentryMode');
    const sentryMode = sentryData?.value.sentryModeStateValue;

    if (sentryMode === SentryModeState.Aware) {
      await this.sendSentryAlert(telemetryMessage);
    }
  }

  private async sendSentryAlert(message: TelemetryMessage): Promise<void> {
    const handlerStartTime = Date.now();

    try {
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
      this.logSentryAlertLatency(message, handlerStartTime);
    } catch (error) {
      this.logger.error(`Error in SentryAlert:`, error);
      throw error;
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

