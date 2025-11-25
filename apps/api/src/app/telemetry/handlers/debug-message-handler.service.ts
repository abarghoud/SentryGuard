import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramService } from '../../telegram/telegram.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { User } from '../../../entities/user.entity';
import { TelemetryEventHandler, TelemetryMessage } from '../interfaces/telemetry-event-handler.interface';

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
        await this.telegramService.sendTelegramMessage(vehicle.userId, jsonStr);
      }
    } catch (error) {
      this.logger.error('Error handling debug messages:', error);
      throw error;
    }
  }
}
