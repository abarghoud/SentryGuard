import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';

@Injectable()
export class AlertsOffensiveResponseService {
  private readonly logger = new Logger(AlertsOffensiveResponseService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly teslaVehicleCommandService: TeslaVehicleCommandService,
  ) {}

  async handleBreakInOffensiveResponse(vin: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      const vehicle = await this.findVehicleByVin(vin, userId);

      if (
        vehicle &&
        vehicle.break_in_offensive_response !== OffensiveResponse.DISABLED &&
        await this.executeOffensiveResponse(vehicle)
      ) {
        return;
      }
    }

    this.logger.debug(`[OFFENSIVE] No eligible user found for break-in offensive response on VIN ${vin}`);
  }

  private async findVehicleByVin(vin: string, userId: string): Promise<Vehicle | null> {
    return this.vehicleRepository.findOne({ where: { vin, userId } });
  }

  private async executeOffensiveResponse(vehicle: Vehicle): Promise<boolean> {
    const { vin, userId, break_in_offensive_response } = vehicle;

    try {
      let result;
      if (break_in_offensive_response === OffensiveResponse.HONK) {
        result = await this.teslaVehicleCommandService.honkHorn(vin, userId);
      } else if (break_in_offensive_response === OffensiveResponse.FART) {
        result = await this.teslaVehicleCommandService.remoteBoombox(vin, userId, 1);
      } else {
        return false;
      }

      if (result.success) {
        this.logger.log(`[OFFENSIVE] ${break_in_offensive_response} triggered for VIN ${vin}`);
        return true;
      }

      this.logger.warn(`[OFFENSIVE] ${break_in_offensive_response} failed for VIN ${vin}: ${result.message}`);
      return false;
    } catch (error: unknown) {
      this.logger.error(`[OFFENSIVE] Error triggering ${break_in_offensive_response} for VIN ${vin}`, error);
      return false;
    }
  }
}