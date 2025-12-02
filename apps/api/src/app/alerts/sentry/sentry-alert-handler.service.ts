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
      // Get pool statistics before query
      const connection = this.vehicleRepository.manager.connection;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const driver = connection.driver as any;
      const pool = driver.master || driver.pool;
      const poolStats = pool 
        ? `Pool(idle:${pool.idleCount || 0}/${pool.totalCount || 0},waiting:${pool.waitingCount || 0})`
        : 'Pool(N/A)';

      const dbStart = Date.now();
      const vehicle = await this.vehicleRepository.findOne({
        where: { vin: message.vin },
        select: ['userId', 'display_name'],
      });
      const dbTime = Date.now() - dbStart;

      this.logger.log(`[DB_TIME][VEHICLE_LOOKUP] ${dbTime}ms | ${poolStats} | VIN: ${message.vin} (correlation: ${message.correlationId})`);

      if (dbTime > 100) {
        this.logger.warn(`[DB_SLOW][${message.correlationId}] Vehicle lookup: ${dbTime}ms | ${poolStats} | VIN: ${message.vin}`);
      }

      if (!vehicle) {
        this.logger.warn(`No vehicle found for VIN: ${message.vin}`);
        return;
      }

      const alertInfo = {
        vin: message.vin,
        display_name: vehicle.display_name
      };

      const telegramStart = Date.now();
      await this.telegramService.sendSentryAlert(vehicle.userId, alertInfo);
      const telegramTime = Date.now() - telegramStart;

      if (telegramTime > 500) {
        this.logger.warn(`[TELEGRAM_SLOW][${message.correlationId}] Sentry alert: ${telegramTime}ms for user: ${vehicle.userId}`);
      }

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

