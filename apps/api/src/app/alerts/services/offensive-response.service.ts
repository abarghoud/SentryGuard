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

  async handleOffensiveResponse(vin: string): Promise<void> {
    const vehicle = await this.findVehicleByVin(vin);

    if (!vehicle) {
      this.logger.debug(`[OFFENSIVE] No vehicle found for VIN ${vin}`);
      return;
    }

    if (vehicle.offensive_response === OffensiveResponse.DISABLED) {
      this.logger.debug(`[OFFENSIVE] Offensive response disabled for VIN ${vin}`);
      return;
    }

    if (!vehicle.sentry_mode_monitoring_enabled && !vehicle.break_in_monitoring_enabled) {
      this.logger.debug(`[OFFENSIVE] No monitoring enabled for VIN ${vin}`);
      return;
    }

    await this.executeOffensiveResponse(vehicle);
  }

  private async findVehicleByVin(vin: string): Promise<Vehicle | null> {
    return this.vehicleRepository.findOne({ where: { vin } });
  }

  private async executeOffensiveResponse(vehicle: Vehicle): Promise<void> {
    const { vin, userId, offensive_response } = vehicle;

    const commandPromises: Promise<void>[] = [];

    if (offensive_response === OffensiveResponse.FLASH || offensive_response === OffensiveResponse.FLASH_AND_HONK) {
      commandPromises.push(this.flashLights(vin, userId));
    }

    if (offensive_response === OffensiveResponse.HONK || offensive_response === OffensiveResponse.FLASH_AND_HONK) {
      commandPromises.push(this.honkHorn(vin, userId));
    }

    await Promise.allSettled(commandPromises);
  }

  private async flashLights(vin: string, userId: string): Promise<void> {
    try {
      const result = await this.teslaVehicleCommandService.flashLights(vin, userId);

      if (result.success) {
        this.logger.log(`[OFFENSIVE] Flash lights triggered for VIN ${vin}`);
      } else {
        this.logger.warn(`[OFFENSIVE] Flash lights failed for VIN ${vin}: ${result.message}`);
      }
    } catch (error: unknown) {
      this.logger.error(`[OFFENSIVE] Error triggering flash lights for VIN ${vin}`, error);
    }
  }

  private async honkHorn(vin: string, userId: string): Promise<void> {
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