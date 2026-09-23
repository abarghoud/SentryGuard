import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Vehicle } from '../../entities/vehicle.entity';

export interface UpdateAlertSoundsDto {
  break_in_alert_sound?: string;
  sentry_alert_sound?: string;
}

export interface UpdateAlertSoundsResult {
  break_in_alert_sound?: string;
  sentry_alert_sound?: string;
  success: boolean;
}

@Injectable()
export class VehicleAlertSoundConfigService {
  private readonly logger = new Logger(VehicleAlertSoundConfigService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  public async updateAlertSounds(
    userId: string,
    vin: string,
    dto: UpdateAlertSoundsDto
  ): Promise<UpdateAlertSoundsResult> {
    const vehicle = await this.vehicleRepository.findOne({ where: { userId, vin } });

    if (!vehicle) {
      return { success: false };
    }

    this.applyAlertSounds(vehicle, dto);
    await this.vehicleRepository.save(vehicle);
    this.logger.log(
      `Alert sounds updated for ${vin}: sentry=${vehicle.sentry_alert_sound}, break_in=${vehicle.break_in_alert_sound}`
    );

    return {
      break_in_alert_sound: vehicle.break_in_alert_sound,
      sentry_alert_sound: vehicle.sentry_alert_sound,
      success: true,
    };
  }

  private applyAlertSounds(vehicle: Vehicle, dto: UpdateAlertSoundsDto): void {
    if (dto.sentry_alert_sound !== undefined) {
      vehicle.sentry_alert_sound = dto.sentry_alert_sound;
    }

    if (dto.break_in_alert_sound !== undefined) {
      vehicle.break_in_alert_sound = dto.break_in_alert_sound;
    }
  }
}
