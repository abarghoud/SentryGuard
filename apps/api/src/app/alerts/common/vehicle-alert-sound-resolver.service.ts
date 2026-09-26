import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AlertEventType } from '../../../entities/alert-event.entity';
import { Vehicle } from '../../../entities/vehicle.entity';
import { AlertSound, DEFAULT_ALERT_SOUND, resolveAlertSound } from '../enums/alert-sound.enum';

@Injectable()
export class VehicleAlertSoundResolverService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  public async resolve(userId: string, vin: string, type: AlertEventType): Promise<AlertSound> {
    const vehicle = await this.vehicleRepository.findOne({
      select: { break_in_alert_sound: true, sentry_alert_sound: true },
      where: { userId, vin },
    });

    if (!vehicle) {
      return DEFAULT_ALERT_SOUND;
    }

    return resolveAlertSound(this.pickConfiguredSound(vehicle, type));
  }

  private pickConfiguredSound(vehicle: Vehicle, type: AlertEventType): string {
    return type === AlertEventType.BreakIn ? vehicle.break_in_alert_sound : vehicle.sentry_alert_sound;
  }
}
