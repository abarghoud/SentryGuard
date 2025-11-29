import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramService } from '../../telegram/telegram.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { User } from '../../../entities/user.entity';
import { TelemetryEventHandler } from '../interfaces/telemetry-event-handler.interface';
import { TelemetryMessage } from '../models/telemetry-message.model';

@Injectable()
export class DebugMessageHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(DebugMessageHandlerService.name);

  constructor(
    private readonly telegramService: TelegramService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    const startTime = Date.now();

    try {
      const vehicle = await this.vehicleRepository.findOne({
        where: { vin: telemetryMessage.vin },
        select: ['userId'],
      });

      if (!vehicle) {
        this.logger.warn(`No vehicle found for VIN: ${telemetryMessage.vin}`);
        return;
      }

      const user = await this.userRepository.findOne({
        where: { userId: vehicle.userId },
        select: ['debug_messages'],
      });

      if (user?.debug_messages) {
        const jsonStr = JSON.stringify(telemetryMessage);
        await this.telegramService.sendTelegramMessage(vehicle.userId, jsonStr, telemetryMessage.vin);

        // Mesurer et logger la latence end-to-end
        this.logEndToEndLatency(telemetryMessage, startTime);
      }
    } catch (error) {
      this.logger.error('Error handling debug messages:', error);
      throw error;
    }
  }

  private logEndToEndLatency(telemetryMessage: TelemetryMessage, handlerStartTime: number): void {
    if (!telemetryMessage.correlationId) {
      return; // Pas un message de test de performance
    }

    const endToEndLatency = telemetryMessage.calculateEndToEndLatency();
    const handlerProcessingTime = Date.now() - handlerStartTime;

    if (endToEndLatency !== null) {
      const isDelayed = telemetryMessage.isDelayed(1000);

      if (isDelayed) {
        this.logger.error(`[LATENCY] CorrelationId: ${telemetryMessage.correlationId} - DELAYED: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ❌`);
      } else {
        this.logger.log(`[LATENCY] CorrelationId: ${telemetryMessage.correlationId} - Total: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ✅`);
      }
    } else {
      this.logger.log(`[LATENCY] CorrelationId: ${telemetryMessage.correlationId} - Handler processing: ${handlerProcessingTime}ms (no sentAt timestamp)`);
    }
  }
}
