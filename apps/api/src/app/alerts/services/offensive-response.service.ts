import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../../entities/vehicle.entity';
import { OffensiveResponse } from '../enums/offensive-response.enum';
import { TeslaVehicleCommandService } from '../../telemetry/services/tesla-vehicle-command.service';

@Injectable()
export class OffensiveResponseService {
  private readonly logger = new Logger(OffensiveResponseService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly teslaVehicleCommandService: TeslaVehicleCommandService,
  ) {}

  async handleSentryOffensiveResponse(vin: string): Promise<void> {
    const vehicle = await this.findVehicleByVin(vin);

    if (!vehicle) {
      this.logger.debug(`[OFFENSIVE] No vehicle found for VIN ${vin}`);
      return;
    }

    if (vehicle.sentry_offensive_response === OffensiveResponse.DISABLED) {
      this.logger.debug(`[OFFENSIVE] Sentry offensive response disabled for VIN ${vin}`);
      return;
    }

    if (!vehicle.sentry_mode_monitoring_enabled) {
      this.logger.debug(`[OFFENSIVE] Sentry mode monitoring not enabled for VIN ${vin}`);
      return;
    }

    await this.executeOffensiveResponse(vehicle);
  }

  async handleBreakInOffensiveResponse(vin: string): Promise<void> {
    const vehicle = await this.findVehicleByVin(vin);

    if (!vehicle) {
      this.logger.debug(`[OFFENSIVE] No vehicle found for VIN ${vin}`);
      return;
    }

    if (vehicle.break_in_offensive_response === OffensiveResponse.DISABLED) {
      this.logger.debug(`[OFFENSIVE] Break-in offensive response disabled for VIN ${vin}`);
      return;
    }

    if (!vehicle.break_in_monitoring_enabled) {
      this.logger.debug(`[OFFENSIVE] Break-in monitoring not enabled for VIN ${vin}`);
      return;
    }

    await this.executeOffensiveResponse(vehicle);
  }

  private async findVehicleByVin(vin: string): Promise<Vehicle | null> {
    return this.vehicleRepository.findOne({ where: { vin } });
  }

  private async executeOffensiveResponse(vehicle: Vehicle): Promise<void> {
    const { vin, userId } = vehicle;

    try {
      const result = await this.teslaVehicleCommandService.honkHorn(vin, userId);

      if (result.success) {
        this.logger.log(`[OFFENSIVE] Honk horn triggered for VIN ${vin}`);
      } else {
        this.logger.warn(`[OFFENSIVE] Honk horn failed for VIN ${vin}: ${result.message}`);
      }
    } catch (error: unknown) {
      this.logger.error(`[OFFENSIVE] Error triggering honk horn for VIN ${vin}`, error);
    }
  }
}